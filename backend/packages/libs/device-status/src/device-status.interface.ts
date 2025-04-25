import {
  ModelOfMiner
} from "@saito/models";

export abstract class DeviceStatusService {
  abstract register(credentials: ModelOfMiner<'DeviceCredentials'>): Promise<ModelOfMiner<'RegistrationResponse'>>;
  abstract getDeviceStatus(deviceId: string): Promise<ModelOfMiner<'DeviceStatusModule'> | null>;
  abstract updateDeviceStatus(
    deviceId: string,
    name: string,
    status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed",
    rewardAddress: string
  ): Promise<ModelOfMiner<'DeviceStatusModule'>>;
  abstract markInactiveDevicesOffline(inactiveDuration: number): Promise<ModelOfMiner<'DeviceStatusModule'>[]>;
  abstract getDeviceList(): Promise<ModelOfMiner<'DeviceListItem'>[]>;
  abstract getCurrentDevice(): Promise<ModelOfMiner<'DeviceStatusModule'>>;
  abstract getDeviceTasks(deviceId: string): Promise<ModelOfMiner<'TaskResult'>[]>;
  abstract getDeviceEarnings(deviceId: string): Promise<ModelOfMiner<'EarningResult'>[]>;
  abstract getGatewayStatus(): Promise<{ isRegistered: boolean }>;
  abstract getDeviceId(): Promise<string>;
  abstract getDeviceName(): Promise<string>;
  abstract getRewardAddress(): Promise<string>;
  abstract getGatewayAddress(): Promise<string>;
  abstract getKey(): Promise<string>;
  abstract isRegistered(): Promise<boolean>;
  abstract getDeviceType(): Promise<string>;
  abstract getDeviceModel(): Promise<string>;
  abstract getDeviceInfo(): Promise<string>;
  abstract checkStatus(): Promise<boolean>;
  abstract isOllamaOnline(): Promise<boolean>;
  abstract heartbeat(): Promise<void>;
}
