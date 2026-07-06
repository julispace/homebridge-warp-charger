import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { applyAccessoryDefinitions } from './accessoryDefinitions.js';
import type { ConfirmedDeviceConfig, ProbeMetadata } from './types.js';
import type { WarpHomekitPlatform } from './platform.js';

const EV_CHARGER_CAPABILITIES = ['ev_charger', 'evse', 'charger'];
const ENERGY_CAPABILITIES = ['power', 'energy', 'meter'];
const BATTERY_CAPABILITIES = ['battery', 'backup'];

export type AccessoryContextDevice = {
  id: string;
  address: string;
  name: string;
  model: string;
  serialNumber: string;
  firmwareRevision?: string;
  capabilities: string[];
  availableDefinitionIds: string[];
  profile: {
    primary: 'outlet' | 'switch';
    energy: boolean;
    battery: boolean;
  };
};

function normalizeCapabilityName(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizeCapabilities(value: ProbeMetadata['capabilities']): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value
    .map(normalizeCapabilityName)
    .filter((entry): entry is string => entry !== undefined))];
}

function hasAnyCapability(capabilities: string[], expected: string[]): boolean {
  return expected.some((entry) => capabilities.includes(entry));
}

function readMetadataString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function profileFromMetadata(capabilities: string[], metadata: ProbeMetadata | undefined) {
  const modelHint = readMetadataString(metadata?.type)?.toLowerCase();
  const hasEvChargerCapability = hasAnyCapability(capabilities, EV_CHARGER_CAPABILITIES)
    || Boolean(modelHint && modelHint.includes('charger'));
  const primary: 'outlet' | 'switch' = hasEvChargerCapability ? 'outlet' : 'switch';

  return {
    primary,
    energy: hasAnyCapability(capabilities, ENERGY_CAPABILITIES),
    battery: hasAnyCapability(capabilities, BATTERY_CAPABILITIES),
  };
}

export function buildAccessoryContext(
  confirmedDevice: ConfirmedDeviceConfig,
  metadata: ProbeMetadata | undefined,
  availableDefinitionIds: string[] = [],
): AccessoryContextDevice {
  const capabilities = normalizeCapabilities(metadata?.capabilities);
  const profile = profileFromMetadata(capabilities, metadata);

  return {
    id: confirmedDevice.id,
    address: confirmedDevice.address,
    name: readMetadataString(metadata?.displayName)
      ?? readMetadataString(metadata?.name)
      ?? confirmedDevice.id,
    model: readMetadataString(metadata?.displayType)
      ?? readMetadataString(metadata?.type)
      ?? 'Warp Device',
    serialNumber: readMetadataString(metadata?.uid)
      ?? readMetadataString(metadata?.deviceId)
      ?? confirmedDevice.id,
    firmwareRevision: readMetadataString(metadata?.firmware),
    capabilities,
    availableDefinitionIds,
    profile,
  };
}

function normalizeAccessoryContext(accessory: PlatformAccessory): AccessoryContextDevice {
  const device = accessory.context.device as Partial<AccessoryContextDevice> | undefined;
  const id = typeof device?.id === 'string' && device.id.length > 0 ? device.id : accessory.UUID;
  const name = typeof device?.name === 'string' && device.name.length > 0 ? device.name : accessory.displayName;

  return {
    id,
    address: typeof device?.address === 'string' && device.address.length > 0 ? device.address : id,
    name,
    model: typeof device?.model === 'string' && device.model.length > 0 ? device.model : 'Warp Device',
    serialNumber: typeof device?.serialNumber === 'string' && device.serialNumber.length > 0 ? device.serialNumber : id,
    firmwareRevision: typeof device?.firmwareRevision === 'string' && device.firmwareRevision.length > 0 ? device.firmwareRevision : undefined,
    capabilities: Array.isArray(device?.capabilities)
      ? device.capabilities.filter((entry): entry is string => typeof entry === 'string')
      : [],
    availableDefinitionIds: Array.isArray(device?.availableDefinitionIds)
      ? device.availableDefinitionIds.filter((entry): entry is string => typeof entry === 'string')
      : [],
    profile: device?.profile && typeof device.profile === 'object'
      ? {
        primary: device.profile.primary === 'outlet' ? 'outlet' : 'switch',
        energy: Boolean(device.profile.energy),
        battery: Boolean(device.profile.battery),
      }
      : {
        primary: 'switch',
        energy: false,
        battery: false,
      },
  };
}

export class WarpPlatformAccessory {
  private readonly runtimeState = {
    on: false,
    inUse: false,
  };

  constructor(
    private readonly platform: WarpHomekitPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const device = normalizeAccessoryContext(accessory);
    this.accessory.context.device = device;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Warp')
      .setCharacteristic(this.platform.Characteristic.Model, device.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, device.serialNumber);

    if (device.firmwareRevision) {
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, device.firmwareRevision);
    }

    applyAccessoryDefinitions({
      platform: this.platform,
      accessory: this.accessory,
      device,
      definitions: this.platform.accessoryDefinitions,
      handlers: {
        setOn: this.setOn.bind(this),
        getOn: this.getOn.bind(this),
        getOutletInUse: this.getOutletInUse.bind(this),
      },
    });
  }

  async setOn(value: CharacteristicValue) {
    this.runtimeState.on = value as boolean;
    this.runtimeState.inUse = this.runtimeState.on;
    this.platform.log.debug(`Set Characteristic On -> ${String(value)}`);
  }

  async getOn(): Promise<CharacteristicValue> {
    this.platform.log.debug(`Get Characteristic On -> ${String(this.runtimeState.on)}`);
    return this.runtimeState.on;
  }

  async getOutletInUse(): Promise<CharacteristicValue> {
    this.platform.log.debug(`Get Characteristic OutletInUse -> ${String(this.runtimeState.inUse)}`);
    return this.runtimeState.inUse;
  }
}
