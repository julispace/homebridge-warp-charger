# Warp HomeKit

A homebridge plugin for controlling Tinkerforge WARP Chargers. 

This exposes the following services:
- EVSE Connected
- Cable plugged in
- Current consumption
- EVSE Error State
- EVSE Charging State

Due to HomeKit currently not directly supporting EV Chargers or anything reasonably close, this plugin uses some workarounds.
The states are created as contact sensors, with one per state for enum states. 
Consumption statistics are a custom service.

Please refer to the [WARP Documentation](https://docs.warp-charger.com/en/docs/smart_home/homekit/) for installation and configuration.  

## Contributing

If you have anything to contribute, or functionality that you lack - you are more than welcome to participate!


