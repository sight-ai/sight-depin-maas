export abstract class DeviceStatusService {
  abstract register(): void;

  abstract getDeviceType(): Promise<string>;
  abstract getDeviceModel(): Promise<string>;

  abstract getDeviceInfo(): Promise<string>;
  abstract heartbeat(): void;
  abstract updateDeviceStatus(deviceId: string, name: string, status: "online" | "offline"): void;

  abstract getDeviceStatus(deviceId: string): void;

  abstract markInactiveDevicesOffline(inactiveDuration: number): void;

  abstract checkOllamaStatus(): void;

  abstract isOllamaOnline(): Promise<boolean>;
}
