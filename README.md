# Warp HomeKit

A Homebridge plugin for controlling Tinkerforge WARP Chargers via HTTP/HTTPS API.

## Features

This plugin exposes the following services to HomeKit:

**EVSE Control:**
- Start Charging button (momentary press)
- Stop Charging button (momentary press)

**EVSE State Sensors:**
- EVSE Error State
- EVSE: No EV Connected
- EVSE: Waiting For Release
- EVSE: Ready
- EVSE: Charging

**Additional Sensors:**
- ENWG 14a Limit Active
- Power Manager Active

**Optional Services:**
- Battery service (for backup-capable devices)
- Eve Consumption service (power/energy metering)

Due to HomeKit not directly supporting EV Chargers, this plugin uses contact sensors for state representation and stateless programmable switches for control buttons.

## Installation

```bash
npm install -g homebridge-warp-charger
```

Or install via the Homebridge UI.

## Configuration

Configure the plugin via the Homebridge UI or manually edit `config.json`:

```json
{
  "platforms": [
    {
      "platform": "warpHomebridge",
      "name": "Warp",
      "pollInterval": 60,
      "confirmedDevices": [
        {
          "id": "warp3-AbCd",
          "address": "warp3-AbCd.local",
          "enabled": true,
          "apiProtocol": "https",
          "apiPort": 443,
          "apiUsername": "admin",
          "apiPassword": "your-password"
        }
      ]
    }
  ]
}
```

### Configuration Options

- `platform`: Must be `"warpHomebridge"`
- `name`: Display name for the platform
- `pollInterval`: How often to poll device API in seconds (default: 60)
- `confirmedDevices`: Array of manually configured devices
  - `id`: Unique identifier for the device
  - `address`: Network address (hostname or IP)
  - `enabled`: Enable/disable the device (default: true)
  - `apiProtocol`: `"http"` or `"https"` (default: `"http"`)
  - `apiPort`: API port number (default: 80 for HTTP, 443 for HTTPS)
  - `apiUsername`: Optional HTTP Digest authentication username
  - `apiPassword`: Optional HTTP Digest authentication password

## Documentation

- [Accessory Definitions](ACCESSORY_DEFINITIONS.md) - Guide for adding new accessories
- [CHANGELOG](CHANGELOG.md) - Version history and release notes
- [WARP Documentation](https://docs.warp-charger.com/en/docs/smart_home/homekit/) - Official WARP Charger docs

## Contributing

Contributions are welcome! If you have anything to contribute or functionality you need, feel free to:

- Open an issue on [GitHub](https://github.com/julispace/homebridge-warp-charger/issues)
- Submit a pull request

## License

Apache-2.0

