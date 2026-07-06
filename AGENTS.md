<!--
AGENTS.md
Homebridge plugin: warp-homekit (HTTP API, manual device configuration)
-->

# warp-homekit — Agent specification

Overview
- Purpose: A Homebridge platform plugin that exposes Warp energy-management and EV charger devices to HomeKit.
- Communications: HTTP/HTTPS API for telemetry and control.
- Provisioning: devices are configured manually in `confirmedDevices`; no mDNS autodiscovery.

Architecture overview
- Components
  - HTTP API client: performs authenticated reads and commands against the device API.
  - Device info reader: reads metadata from documented `info/*` endpoints.
  - Accessory manager: creates and updates Homebridge accessories from configured devices.
  - Accessory definition catalog: service mapping in `src/accessoryDefinitions.ts`.

Runtime behavior
- Startup: load accessory definitions -> reconcile configured devices -> start periodic reconciliation.
- Runtime: poll configured devices via HTTP API -> update characteristics.

Configuration model
- Platform config uses manual devices only.
- Supported top-level fields:
  - `name`
  - `pollInterval`
  - `confirmedDevices`
- Per-device fields:
  - `id`
  - `address`
  - `enabled`
  - `apiProtocol`
  - `apiPort`
  - `apiUsername`
  - `apiPassword`

Example `config.json` platform entry

```json
{
  "platforms": [
    {
      "platform": "WarpHomekit",
      "name": "Warp",
      "pollInterval": 60,
      "confirmedDevices": [
        {
          "id": "warp3-AbCd",
          "address": "warp3-AbCd.local",
          "enabled": true,
          "apiProtocol": "https",
          "apiPort": 443,
          "apiUsername": "testuser",
          "apiPassword": "testpass"
        }
      ]
    }
  ]
}
```

Accessory mapping
- Accessory/service definitions are maintained in `src/accessoryDefinitions.ts`.
- Authoring guide: `ACCESSORY_DEFINITIONS.md`.

Security
- Do not log credentials or secrets.
- Prefer `https` where available.

Status tracking
- Keep implementation notes in `STATUS.md`.
