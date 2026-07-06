export type ConfirmedDeviceConfig = {
  id: string;
  address: string;
  enabled?: boolean;
  apiProtocol?: 'http' | 'https';
  apiPort?: number;
  apiUsername?: string;
  apiPassword?: string;
};

export type WarpPlatformConfig = {
  name?: string;
  pollInterval?: number;
  confirmedDevices?: ConfirmedDeviceConfig[];
};

export type RuntimeConfig = {
  name: string;
  pollInterval: number;
  confirmedDevices: ConfirmedDeviceConfig[];
};

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
