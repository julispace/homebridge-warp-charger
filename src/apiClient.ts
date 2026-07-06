import { createHash, randomBytes } from 'node:crypto';

type Logger = {
  debug(message: string, ...parameters: unknown[]): void;
  warn(message: string, ...parameters: unknown[]): void;
};

type ApiClientConfig = {
  timeout: number;
  retryCount: number;
  retryDelay: number;
  log: Logger;
};

type RequestOptions = {
  protocol: 'http' | 'https';
  host: string;
  port: number;
  username?: string;
  password?: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
};

type DigestChallenge = {
  realm: string;
  nonce: string;
  opaque?: string;
  qop?: string;
  algorithm?: string;
};

type ResolvedRequest = {
  origin: string;
  url: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
  username?: string;
  password?: string;
};

function parseDigestChallenge(header: string | null): DigestChallenge | undefined {
  if (!header || !header.startsWith('Digest ')) {
    return undefined;
  }

  const values = new Map<string, string>();
  for (const segment of header.slice('Digest '.length).split(',')) {
    const [rawKey, rawValue] = segment.split('=', 2);
    if (!rawKey || !rawValue) {
      continue;
    }

    const key = rawKey.trim();
    const value = rawValue.trim().replace(/^"|"$/g, '');
    values.set(key, value);
  }

  const realm = values.get('realm');
  const nonce = values.get('nonce');
  if (!realm || !nonce) {
    return undefined;
  }

  return {
    realm,
    nonce,
    opaque: values.get('opaque'),
    qop: values.get('qop'),
    algorithm: values.get('algorithm') ?? 'MD5',
  };
}

function md5(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

export class WarpApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'WarpApiClientError';
  }
}

export class WarpApiClient {
  private readonly digestChallenges = new Map<string, DigestChallenge>();

  constructor(private readonly config: ApiClientConfig) {}

  async getJson<T>(options: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.requestJson<T>({
      ...options,
      method: 'GET',
    });
  }

  async tryGetJson<T>(options: Omit<RequestOptions, 'method' | 'body'>): Promise<T | undefined> {
    try {
      return await this.getJson<T>(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown API error';
      this.config.log.debug(`HTTP API request failed for ${options.host}:${options.port}${options.path}: ${message}`);
      return undefined;
    }
  }

  async requestJson<T>(options: RequestOptions): Promise<T> {
    const timeout = options.timeout ?? this.config.timeout;
    const retries = this.config.retryCount;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await this.performJsonRequest<T>(options, timeout);
      } catch (error) {
        const apiError = this.normalizeError(error);
        const isLastAttempt = attempt === retries;

        if (isLastAttempt || !apiError.retryable) {
          throw apiError;
        }

        const delay = this.config.retryDelay * (2 ** attempt);
        this.config.log.debug(`Retrying HTTP API request in ${delay}ms: ${apiError.message}`);
        await sleep(delay);
      }
    }

    throw new WarpApiClientError('Request retry loop exited unexpectedly');
  }

  private async performJsonRequest<T>(options: RequestOptions, timeout: number): Promise<T> {
    const response = await this.performRequest(options, timeout);

    if (!response.ok) {
      const requestPath = options.path.startsWith('/') ? options.path : `/${options.path}`;
      this.config.log.warn(
        `HTTP API response ${response.status} for ${options.method ?? 'GET'} `
        + `${options.protocol}://${options.host}:${options.port}${requestPath}`,
      );
      throw new WarpApiClientError(
        `HTTP API returned status ${response.status}`,
        response.status,
        isRetryableStatus(response.status),
      );
    }

    const body = await response.json();
    return body as T;
  }

  private async performRequest(options: RequestOptions, timeout: number): Promise<Response> {
    const requestState = this.createRequestState(options);
    let response = await this.fetchWithTimeout(requestState, timeout);

    if (response.status === 401 && this.hasCredentials(requestState)) {
      const challenge = parseDigestChallenge(response.headers.get('www-authenticate'));
      if (!challenge) {
        throw new WarpApiClientError('HTTP API requires unsupported authentication', 401, false);
      }

      this.digestChallenges.set(requestState.origin, challenge);
      requestState.headers.Authorization = this.buildDigestAuthorization(requestState, challenge);
      response = await this.fetchWithTimeout(requestState, timeout);
    }

    return response;
  }

  private async fetchWithTimeout(requestState: ResolvedRequest, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    //this.config.log.debug(`HTTP API request -> ${requestState.method} ${requestState.url}`);

    try {
      const response = await fetch(requestState.url, {
        method: requestState.method,
        headers: requestState.headers,
        body: requestState.body,
        signal: controller.signal,
      });

      //this.config.log.debug(`HTTP API response <- ${response.status} ${requestState.method} ${requestState.url}`);

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new WarpApiClientError(`HTTP API request timed out after ${timeout}ms`, undefined, true);
      }

      const message = error instanceof Error ? error.message : 'Unknown fetch error';
      throw new WarpApiClientError(`HTTP API request failed: ${message}`, undefined, true);
    } finally {
      clearTimeout(timer);
    }
  }

  private createRequestState(options: RequestOptions): ResolvedRequest {
    const path = options.path.startsWith('/') ? options.path : `/${options.path}`;
    const url = `${options.protocol}://${options.host}:${options.port}${path}`;
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...options.headers,
    };

    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    const origin = `${options.protocol}://${options.host}:${options.port}`;
    const challenge = this.digestChallenges.get(origin);
    if (challenge && this.hasCredentials({ username: options.username, password: options.password })) {
      headers.Authorization = this.buildDigestAuthorization({
        origin,
        url,
        path,
        method: options.method ?? 'GET',
        headers,
        body,
        username: options.username,
        password: options.password,
      }, challenge);
    }

    return {
      origin,
      url,
      path,
      method: options.method ?? 'GET',
      headers,
      body,
      username: options.username,
      password: options.password,
    };
  }

  private buildDigestAuthorization(request: ResolvedRequest, challenge: DigestChallenge): string {
    const username = request.username;
    const password = request.password;

    if (!username || !password) {
      throw new WarpApiClientError('Digest authentication requires username and password');
    }

    const qop = challenge.qop?.split(',').map((value) => value.trim()).find((value) => value === 'auth') ?? 'auth';
    const cnonce = randomBytes(8).toString('hex');
    const nc = '00000001';
    const ha1 = md5(`${username}:${challenge.realm}:${password}`);
    const ha2 = md5(`${request.method}:${request.path}`);
    const response = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

    const parts = [
      `Digest username="${username}"`,
      `realm="${challenge.realm}"`,
      `nonce="${challenge.nonce}"`,
      `uri="${request.path}"`,
      `response="${response}"`,
      `algorithm=${challenge.algorithm ?? 'MD5'}`,
      `qop=${qop}`,
      `nc=${nc}`,
      `cnonce="${cnonce}"`,
    ];

    if (challenge.opaque) {
      parts.push(`opaque="${challenge.opaque}"`);
    }

    return parts.join(', ');
  }

  private hasCredentials(request: { username?: string; password?: string }): boolean {
    return Boolean(request.username && request.password);
  }

  private normalizeError(error: unknown): WarpApiClientError {
    if (error instanceof WarpApiClientError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown API client error';
    return new WarpApiClientError(message, undefined, false);
  }
}
