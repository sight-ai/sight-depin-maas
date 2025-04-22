import { 
  TDeviceStatus, 
  TDeviceListItem, 
  TTaskResult, 
  TEarningResult, 
  TDeviceCredentials,
  TRegistrationResponse,
  TDeviceStatusModule,
  TDeviceStatusResponse,
  TDeviceStatusUpdateRequest,
  TDeviceStatusUpdateResponse
} from "@saito/models";

export abstract class DeviceStatusService {
  abstract register(credentials: TDeviceCredentials): Promise<TRegistrationResponse>;
  abstract getDeviceStatus(deviceId: string): Promise<TDeviceStatusModule | null>;
  abstract updateDeviceStatus(
    deviceId: string, 
    name: string, 
    status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed", 
    rewardAddress: string
  ): Promise<TDeviceStatusModule>;
  abstract markInactiveDevicesOffline(inactiveDuration: number): Promise<TDeviceStatusModule[]>;
  abstract getDeviceList(): Promise<TDeviceListItem[]>;
  abstract getCurrentDevice(): Promise<TDeviceStatusModule>;
  abstract getDeviceTasks(deviceId: string): Promise<TTaskResult[]>;
  abstract getDeviceEarnings(deviceId: string): Promise<TEarningResult[]>;
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
