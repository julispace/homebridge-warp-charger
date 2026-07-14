/**
 * Device information reader - fetches metadata from documented /info/* API endpoints.
 * @module deviceInfo
 */

import { WarpApiClient } from './apiClient.js';
import type { ProbeMetadata } from './types.js';

/** Connection parameters for device API access */
type DeviceConnection = {
  protocol: 'http' | 'https';
  host: string;
  port: number;
  username?: string;
  password?: string;
  timeout: number;
};

/** Response from /info/name endpoint */
type InfoNameResponse = {
  name?: string;
  type?: string;
  display_type?: string;
  uid?: string;
};

/** Response from /info/display_name endpoint */
type InfoDisplayNameResponse = {
  display_name?: string;
};

/** Response from /info/version endpoint */
type InfoVersionResponse = {
  firmware?: string;
  config?: string;
  config_type?: string;
};

/**
 * Fetches device metadata from multiple /info/* endpoints in parallel.
 * Returns undefined if all endpoints fail.
 */
export async function fetchDeviceInfo(client: WarpApiClient, connection: DeviceConnection): Promise<ProbeMetadata | undefined> {
  const [nameInfo, displayNameInfo, versionInfo, featuresInfo] = await Promise.all([
    client.tryGetJson<InfoNameResponse>({
      protocol: connection.protocol,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      path: '/info/name',
      timeout: connection.timeout,
    }),
    client.tryGetJson<InfoDisplayNameResponse>({
      protocol: connection.protocol,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      path: '/info/display_name',
      timeout: connection.timeout,
    }),
    client.tryGetJson<InfoVersionResponse>({
      protocol: connection.protocol,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      path: '/info/version',
      timeout: connection.timeout,
    }),
    client.tryGetJson<string[]>({
      protocol: connection.protocol,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      path: '/info/features',
      timeout: connection.timeout,
    }),
  ]);

  if (!nameInfo && !displayNameInfo && !versionInfo && !featuresInfo) {
    return undefined;
  }

  return {
    deviceId: nameInfo?.name ?? nameInfo?.uid,
    name: nameInfo?.name,
    type: nameInfo?.type,
    displayType: nameInfo?.display_type,
    displayName: displayNameInfo?.display_name,
    uid: nameInfo?.uid,
    firmware: versionInfo?.firmware,
    config: versionInfo?.config,
    configType: versionInfo?.config_type,
    capabilities: Array.isArray(featuresInfo) ? featuresInfo.filter((value): value is string => typeof value === 'string') : undefined,
  };
}
