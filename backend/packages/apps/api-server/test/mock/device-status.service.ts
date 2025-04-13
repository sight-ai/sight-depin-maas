import { DeviceStatusService } from "@saito/device-status";
import { m } from "@saito/models";

export class MockedDeviceStatusService implements DeviceStatusService {
  async register(): Promise<{ success: boolean; error: string }> {
    return { success: true, error: '' };
  }

  async getDeviceType(): Promise<string> {
    return 'mock-device-type';
  }

  async getDeviceModel(): Promise<string> {
    return 'mock-device-model';
  }

  async getDeviceInfo(): Promise<string> {
    return 'mock-device-info';
  }

  heartbeat(): void {
    // Mock implementation
  }

  async updateDeviceStatus(deviceId: string, name: string, status: "online" | "offline", rewardAddress: string): Promise<void> {
    // Mock implementation
  }

  async getDeviceStatus(deviceId: string): Promise<{ name: string; status: "online" | "offline" } | null> {
    return { name: 'mock-device', status: 'online' };
  }

  markInactiveDevicesOffline(inactiveDuration: number): void {
    // Mock implementation
  }

  checkOllamaStatus(): void {
    // Mock implementation
  }

  async isOllamaOnline(): Promise<boolean> {
    return true;
  }

  async getDeviceList(): Promise<{ deviceId: string; name: string; status: "online" | "offline" }[]> {
    return [];
  }

  async getCurrentDevice(): Promise<{ deviceId: string; name: string; status: "online" | "offline"; rewardAddress: string | null }> {
    return {
      deviceId: 'mock-device-id',
      name: 'mock-device',
      status: 'online',
      rewardAddress: 'mock-reward-address'
    };
  }

  async getGatewayStatus(): Promise<{ isRegistered: boolean }> {
    return { isRegistered: true };
  }

  async getDeviceId(): Promise<string> {
    return 'mock-device-id';
  }

  async getDeviceName(): Promise<string> {
    return 'mock-device-name';
  }

  async getRewardAddress(): Promise<string> {
    return 'mock-reward-address';
  }
} 