import type { CharacteristicValue, Logging, PlatformAccessory, Service } from 'homebridge';

import type { WarpHomekitPlatform } from './platform.js';
import type { AccessoryContextDevice } from './platformAccessory.js';
import type { ProbeMetadata } from './types.js';

type ServiceTypeKey = 'Outlet' | 'Switch' | 'Battery' | 'ContactSensor' | 'EveConsumption';
type CustomServiceKey = 'Consumption';
type DefinitionCheckType = 'feature' | 'apiBool';
type CharacteristicKey =
  | 'Consumption'
  | 'TotalConsumption'
  | 'ElectricCurrent'
  | 'Voltage'
  | 'ContactSensorState';

type DefinitionValueSource = {
  characteristic: CharacteristicKey;
  source: 'jsonKey' | 'jsonBool' | 'jsonEnum';
  path?: string;
  key?: string;
  enumValue?: number;
  scale?: number;
  offset?: number;
  trueValue?: number;
  falseValue?: number;
};

type AccessoryDefinitionCheck = {
  type: DefinitionCheckType;
  feature?: string;
  path?: string;
  key?: string;
};

type AccessoryServiceDefinition = {
  id: string;
  service: ServiceTypeKey;
  check?: AccessoryDefinitionCheck;
  availability?: AccessoryDefinitionCheck[];
  valueSources?: DefinitionValueSource[];
  enabledWhen?: {
    profilePrimary?: 'outlet' | 'switch';
    profileEnergy?: boolean;
    profileBattery?: boolean;
    customService?: CustomServiceKey;
  };
  nameSuffix?: string;
  subType?: string;
  bindOn?: boolean;
  bindOutletInUse?: boolean;
  defaultCharacteristics?: Record<string, CharacteristicValue>;
};

type AccessoryDefinitionCatalog = {
  services: AccessoryServiceDefinition[];
};

type AccessoryDefinitionValueRefreshContext = {
  platform: WarpHomekitPlatform;
  accessory: PlatformAccessory;
  definitions: AccessoryServiceDefinition[];
  availableDefinitionIds: string[];
  loadApiState(path: string): Promise<unknown | undefined>;
};

type AccessoryRuntimeHandlers = {
  setOn(value: CharacteristicValue): Promise<void>;
  getOn(): Promise<CharacteristicValue>;
  getOutletInUse(): Promise<CharacteristicValue>;
};

type AccessoryDefinitionContext = {
  platform: WarpHomekitPlatform;
  accessory: PlatformAccessory;
  device: AccessoryContextDevice;
  handlers: AccessoryRuntimeHandlers;
  definitions: AccessoryServiceDefinition[];
};

// Single source of truth for accessory configuration.
// Most maintenance work should only require editing this catalog.
const ACCESSORY_DEFINITION_CATALOG: AccessoryDefinitionCatalog = {
  // Direct service definitions. Add new services here.
  services: [

    {
      id: 'primary-switch',
      service: 'Switch',
      enabledWhen: {
        profilePrimary: 'switch',
      },
      bindOn: true,
    },
    {
      id: 'battery',
      service: 'Battery',
      enabledWhen: {
        profileBattery: true,
      },
      nameSuffix: 'Battery',
      defaultCharacteristics: {
        BatteryLevel: 100,
        StatusLowBattery: 0,
      },
    },
    {
      id: 'evse-error-state',
      service: 'ContactSensor',
      check: {
        type: 'feature',
        feature: 'evse',
      },
      nameSuffix: 'EVSE Error State',
      subType: 'evse-error-state',
      valueSources: [
        {
          characteristic: 'ContactSensorState',
          source: 'jsonBool',
          path: 'evse/state',
          key: 'error_state',
          trueValue: 1,
          falseValue: 0,
        },
      ],
      defaultCharacteristics: {
        ContactSensorState: 0,
      },
    },
    {
      id: 'evse-charger-state-not-connected',
      service: 'ContactSensor',
      check: {
        type: 'feature',
        feature: 'evse',
      },
      nameSuffix: 'EVSE: No EV connected',
      subType: 'evse-state-not-connected',
      valueSources: [
        {
          characteristic: 'ContactSensorState',
          source: 'jsonEnum',
          path: 'evse/state',
          key: 'charger_state',
          enumValue: 0,
          trueValue: 1,
          falseValue: 0,
        },
      ],
      defaultCharacteristics: {
        ContactSensorState: 0,
      },
    },
    {
      id: 'evse-charger-state-waiting-for-release',
      service: 'ContactSensor',
      check: {
        type: 'feature',
        feature: 'evse',
      },
      nameSuffix: 'EVSE Waiting For Release',
      subType: 'evse-state-waiting-for-release',
      valueSources: [
        {
          characteristic: 'ContactSensorState',
          source: 'jsonEnum',
          path: 'evse/state',
          key: 'charger_state',
          enumValue: 1,
          trueValue: 1,
          falseValue: 0,
        },
      ],
      defaultCharacteristics: {
        ContactSensorState: 0,
      },
    },
    {
      id: 'evse-charger-state-ready',
      service: 'ContactSensor',
      check: {
        type: 'feature',
        feature: 'evse',
      },
      nameSuffix: 'EVSE: Ready',
      subType: 'evse-state-ready',
      valueSources: [
        {
          characteristic: 'ContactSensorState',
          source: 'jsonEnum',
          path: 'evse/state',
          key: 'charger_state',
          enumValue: 2,
          trueValue: 1,
          falseValue: 0,
        },
      ],
      defaultCharacteristics: {
        ContactSensorState: 0,
      },
    },
    {
      id: 'evse-charger-state-charging',
      service: 'ContactSensor',
      check: {
        type: 'feature',
        feature: 'evse',
      },
      nameSuffix: 'EVSE: Charging',
      subType: 'evse-state-charging',
      valueSources: [
        {
          characteristic: 'ContactSensorState',
          source: 'jsonEnum',
          path: 'evse/state',
          key: 'charger_state',
          enumValue: 3,
          trueValue: 1,
          falseValue: 0,
        },
      ],
      defaultCharacteristics: {
        ContactSensorState: 0,
      },
    },
    {
      id: 'limited-14a-enwg',
      service: 'ContactSensor',
      check: {
        type: 'apiBool',
        path: 'p14a_enwg/config',
        key: 'enable',
      },
      nameSuffix: 'ENWG §14a Limit active',
      subType: 'p14a-limit',
      valueSources: [
        {
          characteristic: 'ContactSensorState',
          source: 'jsonBool',
          path: 'p14a_enwg/state',
          key: 'active',
          trueValue: 1,
          falseValue: 0,
        },
      ],
      defaultCharacteristics: {
        ContactSensorState: 0,
      },
    },
    {
      id: 'active-charge-mode',
      service: 'ContactSensor',
      check: {
        type: 'apiBool',
        path: 'power_manager/config',
        key: 'enabled',
      },
      availability: [
        {
          type: 'apiBool',
          path: 'power_manager/config',
          key: 'enabled',
        },
      ],
      nameSuffix: 'Power Manager Active',
      subType: 'power-manager-active',
      defaultCharacteristics: {
        ContactSensorState: 0,
      },
    },
    {
      id: 'energy',
      service: 'EveConsumption',
      enabledWhen: {
        profileEnergy: true,
        customService: 'Consumption',
      },
      nameSuffix: 'Energy',
      subType: 'energy',
      valueSources: [
        {
          characteristic: 'Consumption',
          source: 'jsonKey',
          path: 'meter/values',
          key: 'power',
        },
        {
          characteristic: 'TotalConsumption',
          source: 'jsonKey',
          path: 'meter/values',
          key: 'energy_abs',
          scale: 0.001,
        },
      ],
      defaultCharacteristics: {
        Consumption: 0,
        TotalConsumption: 0,
      },
    },
  ],
};

function buildAccessoryDefinitions(catalog: AccessoryDefinitionCatalog): AccessoryServiceDefinition[] {
  return [...catalog.services];
}

function cloneAccessoryDefinitions(definitions: AccessoryServiceDefinition[]): AccessoryServiceDefinition[] {
  return definitions.map((definition) => ({
    ...definition,
    check: definition.check ? { ...definition.check } : undefined,
    availability: definition.availability?.map((entry) => ({ ...entry })),
    valueSources: definition.valueSources?.map((entry) => ({ ...entry })),
    enabledWhen: definition.enabledWhen ? { ...definition.enabledWhen } : undefined,
    defaultCharacteristics: definition.defaultCharacteristics ? { ...definition.defaultCharacteristics } : undefined,
  }));
}

const ACCESSORY_DEFINITIONS = buildAccessoryDefinitions(ACCESSORY_DEFINITION_CATALOG);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readServiceType(platform: WarpHomekitPlatform, serviceType: ServiceTypeKey): unknown {
  switch (serviceType) {
  case 'Outlet':
    return platform.Service.Outlet;
  case 'Switch':
    return platform.Service.Switch;
  case 'Battery':
    return platform.Service.Battery;
  case 'ContactSensor':
    return platform.Service.ContactSensor;
  case 'EveConsumption':
    return platform.CustomServices?.Consumption;
  default:
    return undefined;
  }
}

function readServiceName(device: AccessoryContextDevice, definition: AccessoryServiceDefinition): string {
  return definition.nameSuffix ? `${definition.nameSuffix} ${device.name}` : device.name;
}

function shouldEnableDefinition(context: Omit<AccessoryDefinitionContext, 'definitions'>, definition: AccessoryServiceDefinition): boolean {
  if (!definition.enabledWhen) {
    return true;
  }

  if (definition.enabledWhen.profilePrimary && context.device.profile.primary !== definition.enabledWhen.profilePrimary) {
    return false;
  }

  if (definition.enabledWhen.profileEnergy !== undefined && context.device.profile.energy !== definition.enabledWhen.profileEnergy) {
    return false;
  }

  if (definition.enabledWhen.profileBattery !== undefined && context.device.profile.battery !== definition.enabledWhen.profileBattery) {
    return false;
  }

  if (definition.enabledWhen.customService) {
    if (definition.enabledWhen.customService === 'Consumption' && !context.platform.CustomServices?.Consumption) {
      return false;
    }
  }

  return true;
}

function readCharacteristic(platform: WarpHomekitPlatform, key: string): unknown {
  switch (key) {
  case 'Name':
    return platform.Characteristic.Name;
  case 'BatteryLevel':
    return platform.Characteristic.BatteryLevel;
  case 'StatusLowBattery':
    return platform.Characteristic.StatusLowBattery;
  case 'ContactSensorState':
    return platform.Characteristic.ContactSensorState;
  case 'Consumption':
    return platform.CustomCharacteristics?.Consumption;
  case 'TotalConsumption':
    return platform.CustomCharacteristics?.TotalConsumption;
  case 'ElectricCurrent':
    return platform.CustomCharacteristics?.ElectricCurrent;
  case 'Voltage':
    return platform.CustomCharacteristics?.Voltage;
  default:
    return undefined;
  }
}

function normalizeFeature(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function readBooleanFromState(state: unknown, key: string): boolean | undefined {
  if (Array.isArray(state)) {
    const numericKey = Number.parseInt(key, 10);
    if (Number.isInteger(numericKey) && numericKey >= 0 && numericKey < state.length) {
      if (typeof state[numericKey] === 'boolean') {
        return state[numericKey];
      }
      if (typeof state[numericKey] === 'number') {
        return state[numericKey] > 0;
      }
      return undefined;
    }
    return undefined;
  }

  if (isObject(state)) {
    const value = state[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value > 0;
    }
    return undefined;
  }

  return undefined;
}

type AvailableDefinitionResolutionOptions = {
  definitions: AccessoryServiceDefinition[];
  metadata: ProbeMetadata | undefined;
  loadApiState(path: string): Promise<unknown | undefined>;
};

async function evaluateCheck(
  check: AccessoryDefinitionCheck | undefined,
  options: AvailableDefinitionResolutionOptions,
  cachedFeatures: Set<string>,
): Promise<boolean> {
  if (!check) {
    return true;
  }

  if (check.type === 'feature') {
    const feature = normalizeFeature(check.feature);
    return Boolean(feature && cachedFeatures.has(feature));
  }

  if (check.type === 'apiBool') {
    if (!check.path || !check.key) {
      return false;
    }

    const state = await options.loadApiState(check.path);
    return readBooleanFromState(state, check.key) === true;
  }

  return false;
}

export async function resolveAvailableAccessoryDefinitionIds(
  options: AvailableDefinitionResolutionOptions,
): Promise<Set<string>> {
  const supportedDefinitions = new Set<string>();
  const cachedFeatures = new Set((options.metadata?.capabilities ?? [])
    .map(normalizeFeature)
    .filter((feature): feature is string => feature !== undefined));

  for (const definition of options.definitions) {
    const checkMatches = await evaluateCheck(definition.check, options, cachedFeatures);
    if (!checkMatches) {
      continue;
    }

    const availabilityMatches = await Promise.all((definition.availability ?? [])
      .map((entry) => evaluateCheck(entry, options, cachedFeatures)));
    if (availabilityMatches.some((entry) => !entry)) {
      continue;
    }

    supportedDefinitions.add(definition.id);
  }

  return supportedDefinitions;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateCharacteristicIfPresent(service: Service, characteristic: any, value: CharacteristicValue): void {
  if (!characteristic) {
    return;
  }

  service.getCharacteristic(characteristic).updateValue(value);
}

function resolveDefinitionValueSources(definition: AccessoryServiceDefinition): DefinitionValueSource[] {
  return definition.valueSources ?? [];
}

function applyDefinition(context: Omit<AccessoryDefinitionContext, 'definitions'>, definition: AccessoryServiceDefinition): void {
  const serviceType = readServiceType(context.platform, definition.service);
  if (!serviceType) {
    return;
  }

  const valueSources = resolveDefinitionValueSources(definition);

  const existingService = definition.subType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? context.accessory.getServiceById(serviceType as any, definition.subType)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : context.accessory.getService(serviceType as any);

  if (context.device.availableDefinitionIds && !context.device.availableDefinitionIds.includes(definition.id)) {
    if (existingService) {
      context.accessory.removeService(existingService);
    }
    return;
  }

  if (!shouldEnableDefinition(context, definition)) {
    if (existingService) {
      context.accessory.removeService(existingService);
    }
    return;
  }

  const hasBoundCharacteristics = Boolean(definition.bindOn || definition.bindOutletInUse)
    || Object.keys(definition.defaultCharacteristics ?? {}).length > 0
    || valueSources.length > 0;
  if (!hasBoundCharacteristics) {
    if (existingService) {
      context.accessory.removeService(existingService);
    }
    return;
  }

  const serviceName = readServiceName(context.device, definition);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = existingService || context.accessory.addService(serviceType as any, serviceName, definition.subType);
  const isNewService = !existingService;

  service.setCharacteristic(context.platform.Characteristic.Name, serviceName);

  if (definition.bindOn) {
    service.getCharacteristic(context.platform.Characteristic.On)
      .onSet(context.handlers.setOn)
      .onGet(context.handlers.getOn);
  }

  if (definition.bindOutletInUse) {
    service.getCharacteristic(context.platform.Characteristic.OutletInUse)
      .onGet(context.handlers.getOutletInUse);
  }

  if (isNewService) {
    for (const [key, value] of Object.entries(definition.defaultCharacteristics ?? {})) {
      const characteristic = readCharacteristic(context.platform, key);
      updateCharacteristicIfPresent(service, characteristic, value);
    }
  }
}

function readNestedValue(state: unknown, key: string): unknown {
  const segments = key.split('.').filter((segment) => segment.length > 0);
  let currentValue: unknown = state;

  for (const segment of segments) {
    if (Array.isArray(currentValue)) {
      const index = Number.parseInt(segment, 10);
      if (!Number.isInteger(index) || index < 0 || index >= currentValue.length) {
        return undefined;
      }
      currentValue = currentValue[index];
      continue;
    }

    if (isObject(currentValue)) {
      currentValue = currentValue[segment];
      continue;
    }

    return undefined;
  }

  return currentValue;
}

function readNumberValue(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function readBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0;
  }

  return undefined;
}

async function resolveValueSource(
  source: DefinitionValueSource,
  loadApiState: (path: string) => Promise<unknown | undefined>,
): Promise<number | undefined> {
  if (source.source === 'jsonKey') {
    if (!source.path || !source.key) {
      return undefined;
    }

    const state = await loadApiState(source.path);
    return readNumberValue(readNestedValue(state, source.key));
  }

  if (source.source === 'jsonBool') {
    if (!source.path || !source.key) {
      return undefined;
    }

    const state = await loadApiState(source.path);
    const booleanValue = readBooleanValue(readNestedValue(state, source.key));
    if (booleanValue === undefined) {
      return undefined;
    }

    return booleanValue ? (source.trueValue ?? 1) : (source.falseValue ?? 0);
  }

  if (source.source === 'jsonEnum') {
    if (!source.path || !source.key || source.enumValue === undefined) {
      return undefined;
    }

    const state = await loadApiState(source.path);
    const enumStateValue = readNumberValue(readNestedValue(state, source.key));
    if (enumStateValue === undefined) {
      return undefined;
    }

    return enumStateValue === source.enumValue ? (source.trueValue ?? 1) : (source.falseValue ?? 0);
  }

  return undefined;
}

function applyValueTransform(rawValue: number, source: DefinitionValueSource): number {
  const offset = source.offset ?? 0;
  const scale = source.scale ?? 1;
  return (rawValue + offset) * scale;
}

async function refreshDefinitionValues(
  context: AccessoryDefinitionValueRefreshContext,
  definition: AccessoryServiceDefinition,
): Promise<void> {
  const valueSources = resolveDefinitionValueSources(definition);
  if (valueSources.length === 0) {
    return;
  }

  const serviceType = readServiceType(context.platform, definition.service);
  if (!serviceType) {
    return;
  }

  const service = definition.subType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? context.accessory.getServiceById(serviceType as any, definition.subType)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : context.accessory.getService(serviceType as any);
  if (!service) {
    return;
  }

  for (const source of valueSources) {
    const rawValue = await resolveValueSource(source, context.loadApiState);
    if (rawValue === undefined) {
      context.platform.log.debug(
        `Skipping value source for ${definition.id}: unresolved ${source.source} `
        + `${source.path ?? source.key ?? 'unknown-source'}`,
      );
      continue;
    }

    const mappedValue = applyValueTransform(rawValue, source);
    const characteristic = readCharacteristic(context.platform, source.characteristic);
    updateCharacteristicIfPresent(service, characteristic, mappedValue);
    context.platform.log.debug(
      `Updated ${definition.id} characteristic ${source.characteristic}: raw=${rawValue} mapped=${mappedValue}`,
    );
  }
}

export async function refreshAccessoryDefinitionValues(
  context: AccessoryDefinitionValueRefreshContext,
): Promise<void> {
  const availableDefinitionIds = new Set(context.availableDefinitionIds);

  for (const definition of context.definitions) {
    if (!availableDefinitionIds.has(definition.id)) {
      continue;
    }

    await refreshDefinitionValues(context, definition);
  }
}

export async function loadAccessoryDefinitions(log: Pick<Logging, 'debug' | 'warn'>): Promise<AccessoryServiceDefinition[]> {
  const definitions = cloneAccessoryDefinitions(ACCESSORY_DEFINITIONS);
  log.debug(`Loaded ${definitions.length} accessory definition(s) from TypeScript catalog`);
  return definitions;
}

export function applyAccessoryDefinitions(context: AccessoryDefinitionContext): void {
  const applyContext = {
    platform: context.platform,
    accessory: context.accessory,
    device: context.device,
    handlers: context.handlers,
  };

  for (const definition of context.definitions) {
    applyDefinition(applyContext, definition);
  }
}

export type { AccessoryServiceDefinition };
