# Changelog

## [0.1.5] - 2026-07-14

- Added Start Charging and Stop Charging button accessories (StatelessProgrammableSwitch)
  - Momentary press buttons that trigger `/evse/start_charging` and `/evse/stop_charging` API calls
- Expand README

## [0.1.4] - 2026-07-14

- **BREAKING:** Changed platform name from `WarpHomekit` to `warpHomebridge`
  - Users must update their `config.json`: change `"platform": "WarpHomekit"` to `"platform": "warpHomebridge"`
- Changed "ENWG §14a Limit active" to "ENWG 14a Limit Active" for HomeKit compatibility
- Code cleanup

## [0.1.3] - 2026-07-13

- Code documentation and cleanup

## [0.1.2] - 2026-07-12

- Per-state EVSE accessories using enum mapping (charger_state 0-3)
- Fixed intermittent meter/energy values reverting to 0 during reconciliation

## [0.1.1] - 2026-07-10

- Simplified configuration: removed mDNS autodiscovery, now uses manual device configuration only

## [0.1.0] - 2026-07-05

- Initial Release
