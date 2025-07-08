import { ModelOfMiner } from "@saito/models";
import { RegistrationStatus } from './registration-storage';

// Service Tokens
export const DEVICE_STATUS_SERVICE = Symbol('DEVICE_STATUS_SERVICE');
export const DEVICE_REGISTRY_SERVICE = Symbol('DEVICE_REGISTRY_SERVICE');
export const DEVICE_CONFIG_SERVICE = Symbol('DEVICE_CONFIG_SERVICE');
export const DEVICE_DATABASE_SERVICE = Symbol('DEVICE_DATABASE_SERVICE');
export const DEVICE_HEARTBEAT_SERVICE = Symbol('DEVICE_HEARTBEAT_SERVICE');
export const DEVICE_SYSTEM_SERVICE = Symbol('DEVICE_SYSTEM_SERVICE');
export const DEVICE_GATEWAY_SERVICE = Symbol('DEVICE_GATEWAY_SERVICE');

// Core Types
export type DeviceCredentials = ModelOfMiner<'DeviceCredentials'>;
export type RegistrationResponse = ModelOfMiner<'RegistrationResponse'>;
export type DeviceStatusData = ModelOfMiner<'DeviceStatusModule'>;
export type DeviceListItem = ModelOfMiner<'DeviceListItem'>;
export type TaskResult = ModelOfMiner<'TaskResult'>;
export type EarningResult = ModelOfMiner<'EarningResult'>;

export type DeviceStatus = "waiting" | "in-progress" | "connected" | "disconnected" | "failed";

export interface DeviceConfig {
  deviceId: string;
  deviceName: string;
  gatewayAddress: string;
  rewardAddress: string;
  code?: string;
  basePath?: string;
  isRegistered: boolean;
}

export interface GPUInfo {
  model: string;
  vram: string;
  vendor: string;
  type: 'integrated' | 'discrete' | 'unknown';
}

export interface SystemInfo {
  os: string;
  cpu: string;
  memory: string;
  graphics: GPUInfo[];
  ipAddress?: string;
  deviceType?: string;
  deviceModel?: string;
}

export interface RegistrationResult {
  success: boolean;
  error?: string;
  node_id?: string;
  name?: string;
  status?: string;
  config?: DeviceConfig;
}

// Abstract Interfaces
export interface TDeviceRegistry {
  register(credentials: DeviceCredentials, localModels?: any[]): Promise<RegistrationResult>;
  clearRegistration(): Promise<boolean>;
  validateRegistration(config: DeviceConfig): Promise<boolean>;
}

export interface TDeviceConfig {
  initialize(): Promise<void>;
  getCurrentConfig(): DeviceConfig;
  updateConfig(updates: Partial<DeviceConfig>): Promise<void>;
  saveConfigToStorage(config: DeviceConfig, basePath?: string, didDoc?: any): Promise<void>;
  getDeviceId(): string;
  getDeviceName(): string;
  getGatewayAddress(): string;
  getRewardAddress(): string;
  getCode(): string;
  isRegistered(): boolean;
  updateRegistrationStatus(status: RegistrationStatus, error?: string): boolean;
  getRegistrationStatus(): RegistrationStatus;
  getRegistrationStatusInfo(): {
    status: RegistrationStatus;
    error?: string;
    lastAttempt?: string;
  };
}

export interface TDeviceDatabase {
  updateDeviceStatus(deviceId: string, name: string, status: DeviceStatus, rewardAddress: string): Promise<DeviceStatusData>;
  getDeviceStatus(deviceId: string): Promise<DeviceStatusData | null>;
  getDeviceList(): Promise<DeviceListItem[]>;
  getCurrentDevice(): Promise<DeviceStatusData | null>;
  getDeviceTasks(deviceId: string): Promise<TaskResult[]>;
  getDeviceEarnings(deviceId: string): Promise<EarningResult[]>;
  markInactiveDevicesOffline(inactiveDuration: number): Promise<DeviceStatusData[]>;
}

export interface TDeviceHeartbeat {
  sendHeartbeat(config: DeviceConfig, systemInfo: SystemInfo): Promise<void>;
  startHeartbeat(): void;
  stopHeartbeat(): void;
}

export interface TDeviceSystem {
  collectSystemInfo(): Promise<SystemInfo>;
  getDeviceType(): Promise<string>;
  getDeviceModel(): Promise<string>;
  getDeviceInfo(): Promise<string>;
  checkFrameworkStatus(): Promise<boolean>;
  getLocalModels(): Promise<any[]>;
}

export interface TDeviceGateway {
  registerWithGateway(config: DeviceConfig, localModels: any[], systemInfo?: SystemInfo): Promise<RegistrationResult>;
  sendHeartbeatToGateway(config: DeviceConfig, systemInfo: SystemInfo): Promise<void>;
  checkGatewayStatus(gatewayAddress: string): Promise<boolean>;
}

export interface TDeviceStatusService {
  register(credentials: DeviceCredentials): Promise<RegistrationResponse>;
  getDeviceStatus(deviceId: string): Promise<DeviceStatusData | null>;
  updateDeviceStatus(deviceId: string, name: string, status: DeviceStatus, rewardAddress: string): Promise<DeviceStatusData>;
  markInactiveDevicesOffline(inactiveDuration: number): Promise<DeviceStatusData[]>;
  getDeviceList(): Promise<DeviceListItem[]>;
  getCurrentDevice(): Promise<DeviceStatusData | null>;
  getDeviceTasks(deviceId: string): Promise<TaskResult[]>;
  getDeviceEarnings(deviceId: string): Promise<EarningResult[]>;
  getGatewayStatus(): Promise<{ isRegistered: boolean }>;
  getDeviceId(): Promise<string>;
  getDeviceName(): Promise<string>;
  getRewardAddress(): Promise<string>;
  getGatewayAddress(): Promise<string>;
  isRegistered(): Promise<boolean>;
  getDeviceType(): Promise<string>;
  getDeviceModel(): Promise<string>;
  getDeviceInfo(): Promise<string>;
  checkStatus(): Promise<boolean>;
  isOllamaOnline(): Promise<boolean>;
  heartbeat(): Promise<void>;
  clearRegistration(): Promise<boolean>;
}

// Legacy abstract class for backward compatibility
export abstract class DeviceStatusService implements TDeviceStatusService {
  abstract register(credentials: DeviceCredentials): Promise<RegistrationResponse>;
  abstract getDeviceStatus(deviceId: string): Promise<DeviceStatusData | null>;
  abstract updateDeviceStatus(deviceId: string, name: string, status: DeviceStatus, rewardAddress: string): Promise<DeviceStatusData>;
  abstract markInactiveDevicesOffline(inactiveDuration: number): Promise<DeviceStatusData[]>;
  abstract getDeviceList(): Promise<DeviceListItem[]>;
  abstract getCurrentDevice(): Promise<DeviceStatusData | null>;
  abstract getDeviceTasks(deviceId: string): Promise<TaskResult[]>;
  abstract getDeviceEarnings(deviceId: string): Promise<EarningResult[]>;
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
  abstract clearRegistration(): Promise<boolean>;
}
