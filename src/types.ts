/**
 * Core type definitions for platform configuration and device metadata.
 * @module types
 */

/** Per-device configuration with connection and authentication details */
export type ConfirmedDeviceConfig = {
  id: string;
  address: string;
  enabled?: boolean;
  apiProtocol?: 'http' | 'https';
  apiPort?: number;
  apiUsername?: string;
  apiPassword?: string;
};

/** Platform configuration as provided by user in config.json */
export type WarpPlatformConfig = {
  name?: string;
  pollInterval?: number;
  confirmedDevices?: ConfirmedDeviceConfig[];
};

/** Validated runtime configuration with required fields */
export type RuntimeConfig = {
  name: string;
  pollInterval: number;
  confirmedDevices: ConfirmedDeviceConfig[];
};

/** Device metadata fetched from /info/* API endpoints */
export type ProbeMetadata = {
  deviceId?: string;
  name?: string;
  type?: string;
  displayName?: string;
  displayType?: string;
  uid?: string;
  firmware?: string;
  config?: string;
  configType?: string;
  capabilities?: string[];
  [key: string]: unknown;
};
