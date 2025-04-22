import { DeviceStatusService } from "@saito/device-status";
import { TTask, TEarning } from "@saito/models";

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

  async heartbeat(): Promise<void> {
    // Mock implementation
  }

  async updateDeviceStatus(
    deviceId: string,
    name: string,
    status: "connected" | "disconnected" | "failed" | "in-progress" | "waiting",
    rewardAddress: string
  ): Promise<{
    code: string | null;
    status: "connected" | "disconnected" | "failed" | "in-progress" | "waiting";
    name: string;
    id: string;
    created_at: string;
    updated_at: string;
    gateway_address: string | null;
    reward_address: string | null;
    key: string | null;
    up_time_start: string | null;
    up_time_end: string | null;
  }> {
    return {
      code: null,
      status: status,
      name: name,
      id: deviceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      gateway_address: null,
      reward_address: rewardAddress,
      key: null,
      up_time_start: null,
      up_time_end: null
    };
  }

  async getDeviceStatus(deviceId: string): Promise<{
    code: string | null;
    status: "connected" | "disconnected" | "failed" | "in-progress" | "waiting";
    name: string;
    id: string;
    created_at: string;
    updated_at: string;
    gateway_address: string | null;
    reward_address: string | null;
    key: string | null;
    up_time_start: string | null;
    up_time_end: string | null;
  } | null> {
    return {
      code: null,
      status: "connected",
      name: 'mock-device',
      id: deviceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      gateway_address: null,
      reward_address: null,
      key: null,
      up_time_start: null,
      up_time_end: null
    };
  }

  async markInactiveDevicesOffline(inactiveDuration: number): Promise<{
    code: string | null;
    status: "connected" | "disconnected" | "failed" | "in-progress" | "waiting";
    name: string;
    id: string;
    created_at: string;
    updated_at: string;
    gateway_address: string | null;
    reward_address: string | null;
    key: string | null;
    up_time_start: string | null;
    up_time_end: string | null;
  }[]> {
    return [];
  }

  checkOllamaStatus(): void {
    // Mock implementation
  }

  async isOllamaOnline(): Promise<boolean> {
    return true;
  }

  async getDeviceList(): Promise<{
    status: "connected" | "disconnected" | "failed" | "in-progress" | "waiting";
    name: string;
    id: string;
  }[]> {
    return [{
      status: "connected",
      name: "mock-device",
      id: "mock-device-id"
    }];
  }

  async getCurrentDevice(): Promise<{
    code: string | null;
    status: "connected" | "disconnected" | "failed" | "in-progress" | "waiting";
    name: string;
    id: string;
    created_at: string;
    updated_at: string;
    gateway_address: string | null;
    reward_address: string | null;
    key: string | null;
    up_time_start: string | null;
    up_time_end: string | null;
  }> {
    return {
      code: null,
      status: "connected",
      name: "mock-device",
      id: "mock-device-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      gateway_address: null,
      reward_address: null,
      key: null,
      up_time_start: null,
      up_time_end: null
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

  async getGatewayAddress(): Promise<string> {
    return 'mock-gateway-address';
  }

  async getKey(): Promise<string> {
    return 'mock-key';
  }

  async isRegistered(): Promise<boolean> {
    return true;
  }

  async getDeviceTasks(deviceId: string, limit: number = 10): Promise<TTask[]> {
    return [];
  }

  async getDeviceEarnings(deviceId: string, limit: number = 10): Promise<TEarning[]> {
    return [];
  }

  async checkStatus(): Promise<boolean> {
    return true;
  }
} 