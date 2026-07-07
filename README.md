# Warp HomeKit

A homebridge plugin for controlling Tinkerforge WARP Chargers. 

This exposes the following services:
- EVSE Connected
- Cable plugged in
- Current consumption
- EVSE Error State
- EVSE Charging State

Due to HomeKit currently not directly supporting EV Chargers or anything reasonably close, I had to do some workarounds.
The states are created as contact sensors, with one per state for enum states, and the energy consumption is a custom service. 



## Contributing

If you have anything to contribute, or functionality that you lack - you are more than welcome to participate!


