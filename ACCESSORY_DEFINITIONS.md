# Accessory Definitions Guide

This project defines HomeKit services in one place:

- `src/accessoryDefinitions.ts`
- Catalog constant: `ACCESSORY_DEFINITION_CATALOG`

If you need to add or adjust accessories, this is the file to edit.

## Quick Mental Model

There is one definition source:

1. `services`: direct accessory/service definitions (written one-by-one)

All accessory mappings are defined explicitly in that array.

## Definition Fields (Reference)

Each object in `services` uses this shape:

```ts
{
  id: 'unique-id',
  service: 'Switch' | 'Outlet' | 'Battery' | 'ContactSensor' | 'EveConsumption',
  enabledWhen?: {
    profilePrimary?: 'outlet' | 'switch',
    profileEnergy?: boolean,
    profileBattery?: boolean,
    customService?: 'Consumption',
  },
  check?: {
    type: 'feature' | 'apiBool',
    feature?: string,
    path?: string,
    key?: string,
  },
  availability?: [check, ...],
  nameSuffix?: 'Display Name Part',
  subType?: 'stable-subtype',
  bindOn?: boolean,
  bindOutletInUse?: boolean,
  defaultCharacteristics?: {
    [characteristicName: string]: string | number | boolean,
  },
  valueSources?: [
    {
      characteristic: 'Consumption' | 'TotalConsumption' | 'ElectricCurrent' | 'Voltage' | 'ContactSensorState',
      source: 'jsonKey' | 'jsonBool' | 'jsonEnum',
      path?: string,
      key?: string,
      enumValue?: number,
      scale?: number,
      offset?: number,
      trueValue?: number,
      falseValue?: number,
    },
  ],
}
```

### What each section does

- `enabledWhen`: profile-level gate (static capability/profile match)
- `check`: primary runtime availability check
- `availability`: additional runtime checks; all must pass
- `defaultCharacteristics`: initial values when a service is first created
- `valueSources`: live value refresh mapping from API -> characteristic

## How to Add a New Accessory (Step-by-Step)

1. Open `src/accessoryDefinitions.ts` and find `ACCESSORY_DEFINITION_CATALOG.services`.
2. Copy a similar existing definition (`ContactSensor` or `EveConsumption` are common).
3. Set a unique `id` and stable `subType` (for non-primary services).
4. Add `check` and/or `availability` rules so unsupported devices do not expose it.
5. Add `defaultCharacteristics` for an initial value.
6. Add `valueSources` if it should update from API polling.
7. Run `npm test`.

## Example: New Contact Sensor From Boolean API State

```ts
{
  id: 'grid-enabled',
  service: 'ContactSensor',
  check: {
    type: 'apiBool',
    path: 'grid/config',
    key: 'enabled',
  },
  nameSuffix: 'Grid Enabled',
  subType: 'grid-enabled',
  valueSources: [
    {
      characteristic: 'ContactSensorState',
      source: 'jsonBool',
      path: 'grid/state',
      key: 'active',
      trueValue: 1,
      falseValue: 0,
    },
  ],
  defaultCharacteristics: {
    ContactSensorState: 0,
  },
}
```

## Example: New Energy Characteristic From Numeric API Key

```ts
{
  id: 'house-power',
  service: 'EveConsumption',
  nameSuffix: 'House Power',
  subType: 'house-power',
  valueSources: [
    {
      characteristic: 'Consumption',
      source: 'jsonKey',
      path: 'meter/values',
      key: 'power',
      scale: 1,
    },
  ],
  defaultCharacteristics: {
    Consumption: 0,
  },
}
```

## Configuration Tips

- Keep `id` stable once released; Homebridge uses it to reconcile accessories.
- Always set `subType` for multiple services of the same HomeKit type.
- Prefer `check`/`availability` gates to avoid showing broken accessories.
- If a characteristic should update over time, add `valueSources`; defaults alone are static.
- Use `jsonBool` for boolean endpoints, `jsonEnum` for enum/int state matching, and `jsonKey` for numeric JSON values.
- For power/energy data, use the internal meter endpoint (`meter/*`) instead of the multi-meter API (`meters/*`).

## Validation and Troubleshooting

- Run `npm test` after changes.
- Enable plugin debug logs and look for:
  - `Loaded X accessory definition(s) from TypeScript catalog`
  - `Updated <definition-id> characteristic <key>: raw=<n> mapped=<n>`
  - `Skipping value source for <definition-id>...` (mapping/path issue)

If an accessory never appears, the usual cause is a failing `check` or `availability` rule.
