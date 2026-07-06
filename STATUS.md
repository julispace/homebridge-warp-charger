# Status

## Current Stage

- Stage 5: accessory mapping in progress

## Completed

- Stage 0 scaffold completed from the official Homebridge template
- Project metadata, CI, TypeScript, linting, and local dev config added
- Dependencies installed and scaffold checks verified
- Stage 1 runtime config parsing and defaults started
- Homebridge dev compose setup now mounts and builds this plugin on container startup
- Docker dev setup verified end-to-end: Homebridge now loads `homebridge-warp-homekit`
- Stage 2 modules added: mDNS scanner, HTTP probe helper, and pending device registry
- Stage 2 checks verified locally with `npm test`
- Docker dev setup verified with Stage 2: Homebridge starts the mDNS discovery scan successfully
- Plugin configuration surface reduced to HTTP API plus mDNS discovery; MQTT config removed
- Added `apiProtocol` and optional `apiPort` for HTTP/HTTPS probing and API access
- Rewrote `AGENTS.md` to match the HTTP-only design
- Stage 3 HTTP API client added with timeout, retry, and Digest authentication support
- Refactored connection/auth settings to live per confirmed device instead of globally
- Removed the fake generic probe path and switched metadata reads to documented `info/*` endpoints
- Removed the leftover HTTP prober config surface from schema and docs
- Stage 4 pending-device persistence added under the Homebridge storage path
- Confirmed devices now store both a stable ID and a separate network address
- Config schema now shows confirmed devices as an editable list and moves timing/retry/cache settings into a collapsed advanced section
- Discovered devices are now auto-added to `confirmedDevices` with default HTTP settings
- Confirmed devices now have an `enabled` flag and disabled devices are ignored by runtime logic
- Debug logging was temporarily enabled in the dev stack to investigate config-save failures; verbose object logging has been reduced again to keep plugin log viewing readable
- Fixed 500 "saving failed" error in Homebridge UI: root cause was a cross-device rename failure — the dev compose setup mounted `homebridge-config.dev.json` as a separate bind mount over `/homebridge/config.json`; homebridge-config-ui-x uses atomic writes (write to temp file then rename), which fails with EXDEV when temp and target are on different mount points. Fix: removed the separate bind mount, config is now at `volumes/homebridge/config.json` (same device as temp file)
- Removed `additionalProperties: false` from config.schema.json top-level and confirmedDevices items to avoid schema-validation rejecting the `platform` field Homebridge always adds to platform blocks
- Stage 5 started: confirmed devices are now reconciled into HomeKit accessories after discovery completes
- Added capability-aware accessory context mapping (Outlet/Switch primary service + optional Battery + optional Eve Consumption)
- Accessory metadata now uses `info/*` values for display name, model, serial, and firmware when available
- Added unit tests for accessory context mapping and capability normalization (`src/platformAccessory.test.ts`)
- Verified build and lint via `npm test`; validated mapping tests with `node --test dist/platformAccessory.test.js`
- Moved accessory service composition into `src/accessoryDefinitions.ts` so service add/remove logic is centralized and easier to evolve
- Accessory service composition now loads from JSON (`src/accessoryDefinitions.json`) at startup with runtime validation and fallback defaults
- Accessory definition availability now follows mqtt_auto_discovery-style checks (`feature`, `apiBool`, `meterEnabled`, `meterValue`) and filters entities per device at startup
- Newly discovered devices are now auto-added as disabled (`enabled: false`) and only become active after explicit enablement
- Config schema now conditionally hides API protocol/port/credentials until a device is enabled
- Build now copies `src/accessoryDefinitions.json` into `dist/accessoryDefinitions.json` so packaged runtime can load the definitions
- Added additional accessory definitions from mqtt_auto_discovery (EVSE online/cable, section 14a limit, power manager active) plus meter value templates for up to 8 meter slots
- Added explicit HTTP API request/response URL logging (method + full URL + status) to diagnose failing paths and 400 responses
- Fixed HomeKit 400 characteristic refresh errors by updating dynamic characteristic handling for Eve Consumption services (force characteristic creation before update) and skipping definition services that expose no bound/default characteristics
- Reconcile accessories once before discovery starts so stale cached services are cleaned up before Homebridge UI characteristic refresh kicks in
- Added periodic API-based reconciliation using configured `pollInterval` so definition checks/endpoints are re-evaluated continuously at runtime (with overlap guard and clean shutdown of interval)
- Added value-source mapping for accessory definitions (`jsonKey` and `meterValueId`) and wired live characteristic refresh from device API data on each reconciliation cycle
- Energy and per-meter accessories now resolve values from `meter/values` and `meters/X/value_ids` + `meters/X/values` instead of staying at static zero defaults
- Fixed meter template expansion bug where generated per-meter definitions were missing `valueSources`; meter characteristics now map correctly from `meterValueId` to current values
- Merged accessory definitions into a single TypeScript catalog in `src/accessoryDefinitions.ts` and removed runtime JSON loading/validation helpers
- Removed `src/accessoryDefinitions.json` and simplified the build script to stop copying definition JSON into `dist`
- Fixed intermittent meter/energy values reverting to `0`: default characteristics are now only applied when a service is newly created (not on every reconciliation), so live API refresh values are preserved across polling cycles
- Added robust value-source fallback derivation for `meterValue` definitions: if explicit `valueSources` are missing, runtime now derives a `meterValueId` source from `check` + mapped dynamic default characteristic
- Fixed ENWG §14a limit entity state mapping: accessory availability still uses `p14a_enwg/config.enable`, but `ContactSensorState` now refreshes from `p14a_enwg/state.active` via a new `jsonBool` value source
- Added accessory definition documentation (`ACCESSORY_DEFINITIONS.md`) with field reference, add-new-accessory walkthrough, and configuration examples
- Linked accessory-definition docs from `README.md` for discoverability
- Removed configurable timing/retry/cache fields from user config (`mdnsScanDuration`, `apiTimeout`, `apiRetryCount`, `apiRetryDelay`, `cacheTTL`, `confirmTimeout`) and now use fixed in-code defaults
- Updated config schema/types/docs to match the reduced configuration surface and removed stale references to those fields
- Removed mDNS autodiscovery and pending-device infrastructure; runtime now uses manual `confirmedDevices` configuration only
- Removed mDNS/discovery config keys (`mdnsEnabled`, `hostRegex`, `autoConfirm`) from schema/types/docs and deleted unused discovery registry modules
- Simplified startup flow to reconcile configured devices directly and fetch metadata per configured device via HTTP API
- Updated EVSE accessory definitions: replaced old `evse-online` with `evse-error-state` mapped to `evse/state.error_state`
- Expanded EVSE charger-state handling to explicit per-state accessories (`charger_state` 0-3) using new `jsonEnum` value-source mapping
- Simplified meter handling to WARP charger internal meter API only (`meter/*`); removed multi-meter (`meters/*`) template/check/value-source code paths and accessories

## Current Notes

- Placeholder accessory discovery has been removed for Stage 1.
- The platform now focuses on validated config and safe startup behavior.
- Local development currently uses Node `v25`, so npm shows engine warnings because Homebridge targets Node `22` and `24`.
- The dev Homebridge container now uses `../compose.yml`, `../volumes/homebridge-config.dev.json`, and `../volumes/homebridge-startup.dev.sh` to load this local plugin.
- Container startup runs `npm ci` and `npm run build` inside `/homebridge/node_modules/homebridge-warp-homekit`, so startup requires npm registry access.
- Root cause of the earlier "No plugins found" error: `homebridge-startup.dev.sh` was not executable on the host, so `/homebridge/startup.sh` failed with `Permission denied` and the plugin was never installed.
- Current verified behavior: Homebridge logs `Loaded plugin: homebridge-warp-homekit@0.1.0` and initializes the `WarpHomekit` platform.
- Current provisioning behavior: accessories are created only for manually configured and enabled `confirmedDevices` entries.
- Metadata is read from documented `info/*` endpoints for each configured device using its HTTP/HTTPS/auth settings.
- The HTTP client now supports configurable timeouts, retries with backoff, and per-device HTTP Digest authentication credentials.
- Manual device management is expected: add/update/remove entries in `confirmedDevices` to control accessory provisioning.
- The plugin no longer accepts or documents MQTT configuration.
- Runtime accessory state is still placeholder-only (On/InUse and static defaults for optional Battery/Consumption services) until Stage 6 polling/state updates.
- Accessory definition maintenance now happens in one place (`src/accessoryDefinitions.ts`) via `ACCESSORY_DEFINITION_CATALOG`.
- Root cause for recurring zero values was reconciliation resetting dynamic characteristics to defaults; this is now guarded to first-service-create only, with fallback source derivation in place as a safety net for future definition drift.

## Next

- Stage 6: implement polling/state cache updates and push live values into mapped HomeKit characteristics
- Stage 7: wire mapped services to HTTP command endpoints for charger actions and state transitions
