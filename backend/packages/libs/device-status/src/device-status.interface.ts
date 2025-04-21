import { DeviceListItem, TaskResult, EarningResult } from "@saito/models";

export abstract class DeviceStatusService {
  abstract register( body: { code: string, gateway_address: string, reward_address: string, key: string }): Promise<{
    success: boolean,
    error: string
  }>;

  abstract getDeviceType(): Promise<string>;
  abstract getDeviceModel(): Promise<string>;

  abstract getDeviceInfo(): Promise<string>;
  abstract heartbeat(): void;
  abstract updateDeviceStatus(deviceId: string, name: string, status: "online" | "offline", rewardAddress: string): void;

  abstract getDeviceStatus(deviceId: string): void;

  abstract markInactiveDevicesOffline(inactiveDuration: number): void;

  abstract checkOllamaStatus(): void;

  abstract isOllamaOnline(): Promise<boolean>;

  abstract getDeviceList(): Promise<DeviceListItem[]>;

  abstract getCurrentDevice(): Promise<{
    deviceId: string,
    name: string,
    status: "online" | "offline",
    rewardAddress: string | null
  }>;

  abstract getGatewayStatus(): Promise<{
    isRegistered: boolean
  }>;

  abstract getDeviceId(): Promise<string>;
  abstract getDeviceName(): Promise<string>;
  abstract getRewardAddress(): Promise<string>;
  abstract getGatewayAddress(): Promise<string>;
  abstract getKey(): Promise<string>;
  abstract isRegistered(): Promise<boolean>;
  // // New methods for relational data
  // abstract getDeviceTasks(deviceId: string): Promise<TaskResult[]>;
  
  // abstract getDeviceEarnings(deviceId: string): Promise<EarningResult[]>;
}
