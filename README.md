# Warp HomeKit

Homebridge dynamic platform plugin for Warp energy management and EV charger devices over HTTP API.

Devices are configured manually through `confirmedDevices` in Homebridge config.

Stage 0 provides the project scaffold based on the official Homebridge platform template. The implementation adds:

- Manual per-device configuration (`confirmedDevices`)
- HTTP API integration for status and control
- Accessory mapping and periodic reconciliation

## Development

```sh
npm install
npm test
```

## Accessory Definitions

Accessory mapping is configured in TypeScript and maintained in a single catalog:

- `src/accessoryDefinitions.ts` (`ACCESSORY_DEFINITION_CATALOG`)

For a practical guide on adding and configuring accessories, see:

- `ACCESSORY_DEFINITIONS.md`

## Current Scope

- TypeScript Homebridge platform scaffold
- Homebridge config schema stub
- CI workflow for install, lint, and build
- Local Homebridge development config

## Next Stage

Stage 1 will replace the placeholder platform behavior with config parsing, defaults, and a minimal `WarpHomekitPlatform` entry point.
