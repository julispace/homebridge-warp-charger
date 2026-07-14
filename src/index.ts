/**
 * Plugin entry point - registers the platform with Homebridge.
 * @module index
 */

import type { API } from 'homebridge';

import { WarpHomekitPlatform } from './platform.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * Registers the Warp Homekit platform plugin.
 * Called by Homebridge when the plugin is loaded.
 */
export default (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, WarpHomekitPlatform);
};
