# Status

## Current Stage

Stage 5: Accessory mapping and live state updates (in progress)

## Architecture

**Configuration:**
- Manual device configuration via `confirmedDevices` in config.json
- Per-device HTTP/HTTPS connection settings with optional Digest authentication
- No mDNS autodiscovery (removed for simplicity)
- Devices can be enabled/disabled individually

**Runtime Behavior:**
- Fetches metadata from device `/info/*` endpoints (name, model, firmware, capabilities)
- Periodic polling at configured `pollInterval` (default 60s)
- Accessories reconciled based on device capabilities and API availability checks
- Live characteristic updates from device API state

**Accessory Definitions:**
- Centralized catalog in `src/accessoryDefinitions.ts`
- Feature-based availability checks (`feature`, `apiBool`)
- Value sources: `jsonKey`, `jsonBool`, `jsonEnum` for API-to-characteristic mapping
- Momentary button actions via `command` (API path + null body) for start/stop charging
- Per-state EVSE accessories using enum mapping (charger_state 0-3)
- Energy metering via internal meter API (`meter/*`)
- HomeKit name sanitization for compatibility

**Services Exposed:**
- Primary: Outlet (EV chargers) or Switch
- EVSE state sensors: Error State, Not Connected, Waiting For Release, Ready, Charging
- ENWG 14a Limit Active sensor
- Power Manager Active sensor
- **Start Charging button** (Switch service, momentary)
- **Stop Charging button** (Switch service, momentary)
- Optional: Battery service (for backup-capable devices)
- Optional: Eve Consumption service (power/energy metering)

## Development Notes

**Local Setup:**
- Uses Docker Compose for Homebridge dev environment
- Plugin mounted and built on container startup
- Node v25 (Homebridge targets v22/v24, expect engine warnings)

**Testing:**
- Unit tests: `src/platformAccessory.test.ts` (3 tests, accessory context mapping)
- Build/lint: `npm test`
- Run tests: `node --test dist/platformAccessory.test.js`

**Key Technical Details:**
- HTTP client: timeout, retry with exponential backoff, Digest auth support
- Default characteristics only applied on service creation (not every reconciliation)
- Reconciliation overlap guard prevents concurrent updates
- HomeKit name sanitization removes unsupported characters (§, emoji, etc.)

## Known Issues & Limitations

- Limited test coverage (only platformAccessory module)
- Cached accessories may need to be cleared after adding new services

## Next Steps

- Stage 7: Wire additional control commands via the data-driven `command` field if needed
- Expand test coverage to other modules
