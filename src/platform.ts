import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { EveHomeKitTypes } from 'homebridge-lib/EveHomeKitTypes';

import { WarpApiClient } from './apiClient.js';
import {
  loadAccessoryDefinitions,
  refreshAccessoryDefinitionValues,
  resolveAvailableAccessoryDefinitionIds,
} from './accessoryDefinitions.js';
import { fetchDeviceInfo } from './deviceInfo.js';
import { buildAccessoryContext, WarpPlatformAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import type { ConfirmedDeviceConfig, ProbeMetadata, RuntimeConfig, WarpPlatformConfig } from './types.js';
import type { AccessoryServiceDefinition } from './accessoryDefinitions.js';

const DEFAULT_POLL_INTERVAL = 60;
const DEFAULT_HTTP_PROBE_TIMEOUT = 3000;
const DEFAULT_API_RETRY_COUNT = 2;
const DEFAULT_API_RETRY_DELAY = 500;

export class WarpHomekitPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories = new Map<string, PlatformAccessory>();
  public readonly runtimeConfig: RuntimeConfig;
  public readonly apiClient: WarpApiClient;
  public accessoryDefinitions: AccessoryServiceDefinition[] = [];
  private readonly accessoryHandlers = new Map<string, WarpPlatformAccessory>();
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private reconciliationInProgress = false;

  // This stays available for later custom energy characteristics.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomServices: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomCharacteristics: any;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.runtimeConfig = this.parseConfig(config);
    this.apiClient = new WarpApiClient({
      timeout: DEFAULT_HTTP_PROBE_TIMEOUT,
      retryCount: DEFAULT_API_RETRY_COUNT,
      retryDelay: DEFAULT_API_RETRY_DELAY,
      log: this.log,
    });

    const eveTypes = new EveHomeKitTypes(this.api);
    this.CustomServices = eveTypes.Services;
    this.CustomCharacteristics = eveTypes.Characteristics;

    this.log.debug('Finished initializing platform:', this.runtimeConfig.name);

    this.api.on('didFinishLaunching', () => {
      this.log.info('Warp platform initialized');
      this.log.debug('Executed didFinishLaunching callback');
      this.log.debug('Runtime config:', this.getLoggableConfig());
      void this.initializePlatform();
    });

    this.api.on('shutdown', () => {
      this.log.debug('Homebridge shutdown received');
      this.stopPolling();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  private parseConfig(config: WarpPlatformConfig): RuntimeConfig {
    const name = this.readNonEmptyString(config.name, 'name') ?? 'Warp';

    return {
      name,
      pollInterval: this.readPositiveInteger(config.pollInterval, DEFAULT_POLL_INTERVAL, 'pollInterval'),
      confirmedDevices: this.parseConfirmedDevices(config.confirmedDevices),
    };
  }

  private async initializePlatform() {
    this.accessoryDefinitions = await loadAccessoryDefinitions(this.log);

    if (this.runtimeConfig.confirmedDevices.length === 0) {
      this.log.warn('No confirmed devices configured. Add entries to confirmedDevices to create accessories.');
    }

    await this.reconcileAccessories();
    this.startPolling();
  }

  private startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    const intervalMs = this.runtimeConfig.pollInterval * 1000;
    this.log.info(`Starting API polling/reconciliation every ${this.runtimeConfig.pollInterval}s`);

    this.pollTimer = setInterval(() => {
      void this.runPeriodicReconciliation();
    }, intervalMs);
  }

  private stopPolling() {
    if (!this.pollTimer) {
      return;
    }

    clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }

  private async runPeriodicReconciliation() {
    if (this.reconciliationInProgress) {
      this.log.debug('Skipping periodic reconciliation because a previous run is still active');
      return;
    }

    this.reconciliationInProgress = true;
    try {
      await this.reconcileAccessories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown periodic reconciliation error';
      this.log.warn(`Periodic reconciliation failed: ${message}`);
    } finally {
      this.reconciliationInProgress = false;
    }
  }

  private async reconcileAccessories() {
    const enabledDevices = this.runtimeConfig.confirmedDevices.filter((device) => device.enabled !== false);
    const desiredUuids = new Set<string>();

    for (const device of enabledDevices) {
      const metadata = await this.resolveMetadataForConfirmedDevice(device);
      const availableDefinitionIds = await this.resolveAvailableDefinitionIds(device, metadata);
      const context = buildAccessoryContext(device, metadata, availableDefinitionIds);
      const uuid = this.api.hap.uuid.generate(`warp-homekit:${device.id}`);
      desiredUuids.add(uuid);

      const stateCache = new Map<string, unknown | undefined>();
      const loadApiState = async (path: string) => {
        if (stateCache.has(path)) {
          return stateCache.get(path);
        }

        const state = await this.apiClient.tryGetJson<unknown>({
          protocol: device.apiProtocol ?? 'http',
          host: device.address,
          port: device.apiPort ?? 80,
          username: device.apiUsername,
          password: device.apiPassword,
          path: path.startsWith('/') ? path : `/${path}`,
          timeout: DEFAULT_HTTP_PROBE_TIMEOUT,
        });

        stateCache.set(path, state);
        return state;
      };

      const existingAccessory = this.accessories.get(uuid);
      if (existingAccessory) {
        existingAccessory.context.device = context;
        this.accessoryHandlers.set(uuid, new WarpPlatformAccessory(this, existingAccessory));
        await refreshAccessoryDefinitionValues({
          platform: this,
          accessory: existingAccessory,
          definitions: this.accessoryDefinitions,
          availableDefinitionIds,
          loadApiState,
        });
        this.log.debug(`Updated accessory mapping for confirmed device: ${device.id}`);
        continue;
      }

      const accessory = new this.api.platformAccessory(context.name, uuid);
      accessory.context.device = context;
      this.accessoryHandlers.set(uuid, new WarpPlatformAccessory(this, accessory));
      await refreshAccessoryDefinitionValues({
        platform: this,
        accessory,
        definitions: this.accessoryDefinitions,
        availableDefinitionIds,
        loadApiState,
      });
      this.accessories.set(uuid, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.log.info(`Created accessory for confirmed device: ${context.name} (${device.id})`);
    }

    for (const [uuid, accessory] of this.accessories) {
      if (desiredUuids.has(uuid)) {
        continue;
      }

      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.delete(uuid);
      this.accessoryHandlers.delete(uuid);
      this.log.info(`Removed accessory no longer backed by an enabled confirmed device: ${accessory.displayName}`);
    }
  }

  private parseConfirmedDevices(confirmedDevices: WarpPlatformConfig['confirmedDevices']): ConfirmedDeviceConfig[] {
    if (confirmedDevices === undefined) {
      return [];
    }

    if (!Array.isArray(confirmedDevices)) {
      this.log.warn('Ignoring invalid confirmedDevices value; expected an array of device config objects');
      return [];
    }

    const devices = new Map<string, ConfirmedDeviceConfig>();

    for (const entry of confirmedDevices) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        this.log.warn('Ignoring invalid confirmedDevices entry; expected an object');
        continue;
      }

      const device = entry as ConfirmedDeviceConfig;
      const deviceId = this.readNonEmptyString(device.id, 'confirmedDevices[].id');
      if (!deviceId) {
        continue;
      }

      devices.set(deviceId, {
        id: deviceId,
        address: this.readNonEmptyString(device.address, `confirmedDevices[${deviceId}].address`) ?? deviceId,
        enabled: this.readBoolean(device.enabled, true),
        apiProtocol: device.apiProtocol === 'https' ? 'https' : 'http',
        apiPort: this.readOptionalPositiveInteger(device.apiPort, `confirmedDevices[${deviceId}].apiPort`),
        apiUsername: this.readOptionalString(device.apiUsername),
        apiPassword: this.readOptionalString(device.apiPassword),
      });
    }

    return [...devices.values()];
  }

  private async resolveMetadataForConfirmedDevice(device: ConfirmedDeviceConfig): Promise<ProbeMetadata | undefined> {
    return fetchDeviceInfo(this.apiClient, {
      protocol: device.apiProtocol ?? 'http',
      host: device.address,
      port: device.apiPort ?? 80,
      username: device.apiUsername,
      password: device.apiPassword,
      timeout: DEFAULT_HTTP_PROBE_TIMEOUT,
    });
  }

  private async resolveAvailableDefinitionIds(
    device: ConfirmedDeviceConfig,
    metadata: ProbeMetadata | undefined,
  ): Promise<string[]> {
    const stateCache = new Map<string, unknown | undefined>();

    const supportedDefinitions = await resolveAvailableAccessoryDefinitionIds({
      definitions: this.accessoryDefinitions,
      metadata,
      loadApiState: async (path: string) => {
        if (stateCache.has(path)) {
          return stateCache.get(path);
        }

        const state = await this.apiClient.tryGetJson<unknown>({
          protocol: device.apiProtocol ?? 'http',
          host: device.address,
          port: device.apiPort ?? 80,
          username: device.apiUsername,
          password: device.apiPassword,
          path: path.startsWith('/') ? path : `/${path}`,
          timeout: DEFAULT_HTTP_PROBE_TIMEOUT,
        });

        stateCache.set(path, state);
        return state;
      },
    });

    return [...supportedDefinitions];
  }

  private readPositiveInteger(value: unknown, fallback: number, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      if (value !== undefined) {
        this.log.warn(`Invalid ${fieldName}; using default ${fallback}`);
      }
      return fallback;
    }

    return value;
  }

  private readOptionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      this.log.warn(`Invalid ${fieldName}; ignoring custom value`);
      return undefined;
    }

    return value;
  }

  private readBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private readNonEmptyString(value: unknown, fieldName: string): string | undefined {
    if (typeof value !== 'string') {
      if (value !== undefined) {
        this.log.warn(`Invalid ${fieldName}; expected a string`);
      }
      return undefined;
    }

    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      this.log.warn(`Invalid ${fieldName}; expected a non-empty string`);
      return undefined;
    }

    return normalizedValue;
  }

  private readOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
  }

  private getLoggableConfig() {
    return {
      ...this.runtimeConfig,
      confirmedDevices: this.runtimeConfig.confirmedDevices.map((device) => ({
        ...device,
        apiPassword: device.apiPassword ? '***' : undefined,
      })),
    };
  }
}
