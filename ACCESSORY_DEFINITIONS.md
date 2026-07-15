# Accessory Definitions Guide

The accessories are defined in `src/accessoryDefinitions.ts` in the `services` array.

## Definition Fields 

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
  command?: {
    path: 'evse/start_charging',
    body?: unknown,
  },
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
- `command`: turns the service into a momentary button; on activation it issues a PUT to
  the given device API `path` with `body` (defaults to `null`, as required by WARP action
  endpoints such as `evse/start_charging` / `evse/stop_charging`), then resets to off
- `defaultCharacteristics`: initial values when a service is first created
- `valueSources`: live value refresh mapping from API -> characteristic


## Configuration Tips

- Keep `id` stable once released; Homebridge uses it to reconcile accessories.
- Always set `subType` for multiple services of the same HomeKit type.
- Prefer `check`/`availability` gates to avoid showing broken accessories.
- If a characteristic should update over time, add `valueSources`; defaults alone are static.
- Use `jsonBool` for boolean endpoints, `jsonEnum` for enum/int state matching, and `jsonKey` for numeric JSON values.

