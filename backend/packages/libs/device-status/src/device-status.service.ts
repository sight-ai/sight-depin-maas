import { Injectable, Inject, Logger, forwardRef } from "@nestjs/common";
import * as R from 'ramda';
import { DeviceStatusRepository } from "./device-status.repository";
import { DatabaseTransactionConnection } from "slonik";
import { Cron, CronExpression } from '@nestjs/schedule';
import got from "got-cjs";
import si from 'systeminformation';
import { address } from 'ip';
import { env } from '../env'
import { DeviceStatusService } from "./device-status.interface";
import { TunnelService } from "@saito/tunnel";
import { 
  TDeviceStatus, 
  TDeviceListItem, 
  TTaskResult, 
  TEarningResult, 
  TDeviceCredentials,
  TRegistrationResponse
} from "@saito/models";

type DeviceConfig = {
  deviceId: string;
  deviceName: string;
  rewardAddress: string;
  gatewayAddress: string;
  key: string;
  code: string;
  isRegistered: boolean;
}

const STATUS_CHECK_TIMEOUT = 2000;

type HeartbeatData = {
  cpuLoad: { currentLoad: number };
  memoryInfo: { used: number; total: number };
  gpuInfo: { controllers: Array<{ utilizationGpu: number }> };
  ipAddress: string;
  deviceType: string;
  deviceModel: string;
  deviceInfo: string;
  deviceConfig: DeviceConfig;
};

const formatNumber = (value: number) => Number(value.toFixed(2));

const createHeartbeatData = R.applySpec({
  code: R.path(['deviceConfig', 'code']),
  cpu_usage: R.pipe(
    R.path(['cpuLoad', 'currentLoad']) as (data: HeartbeatData) => number | undefined,
    R.defaultTo(0),
    formatNumber
  ),
  memory_usage: R.pipe(
    R.prop('memoryInfo') as (data: HeartbeatData) => { used: number; total: number },
    ({ used, total }) => formatNumber((used / total) * 100)
  ),
  gpu_usage: R.pipe(
    R.path(['gpuInfo', 'controllers', 0, 'utilizationGpu']) as (data: HeartbeatData) => number | undefined,
    R.defaultTo(0),
    formatNumber
  ),
  ip: R.prop('ipAddress'),
  timestamp: R.always(new Date().toISOString()),
  type: R.prop('deviceType'),
  model: R.prop('deviceModel'),
  device_info: R.prop('deviceInfo'),
  gateway_url: R.path(['deviceConfig', 'gatewayAddress']),
  device_id: R.path(['deviceConfig', 'deviceId'])
});

@Injectable()
export class DefaultDeviceStatusService implements DeviceStatusService {
  private readonly logger = new Logger(DefaultDeviceStatusService.name);
  private deviceConfig: DeviceConfig = {
    deviceId: 'local_device_id',
    deviceName: 'local_device_name',
    rewardAddress: '',
    gatewayAddress: '',
    key: '',
    code: '',
    isRegistered: false
  };
  private readonly baseUrl = env().OLLAMA_API_URL;
  constructor(
    private readonly deviceStatusRepository: DeviceStatusRepository,
    private readonly tunnelService: TunnelService
  ) {
    // Initialize from database if available
    this.initFromDatabase();
  }
  async checkStatus(): Promise<boolean> {
    try {
      const url = new URL(`api/version`, this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: {
          request: STATUS_CHECK_TIMEOUT,
        },
        retry: {
          limit: 0
        }
      });
      
      return response.statusCode === 200;
    } catch (error: any) {
      this.logger.warn(`Ollama service unavailable: ${error.message}`);
      return false;
    }
  }
  private async initFromDatabase() {
    try {
      const currentDevice = await this.getCurrentDevice();
      if (currentDevice && currentDevice.status === 'connected') {
        this.deviceConfig = {
          deviceId: currentDevice.id,
          deviceName: currentDevice.name,
          rewardAddress: currentDevice.reward_address || '',
          gatewayAddress: currentDevice.gateway_address || '',
          key: currentDevice.key || '',
          code: currentDevice.code || '',
          isRegistered: true
        };
      }
    } catch (error) {
      this.logger.error('Failed to initialize device from database');
    }
  }

  async register(credentials: TDeviceCredentials): Promise<TRegistrationResponse> {
    try {
      const [ipAddress, deviceType, deviceModel] = await Promise.all([
        address(),
        this.getDeviceType(),
        this.getDeviceModel(),
      ]);

      this.logger.debug(`Registering device with gateway: ${credentials.gateway_address}`);

      const response = await got.post(`${credentials.gateway_address}/node/register`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.key}`
        },
        json: {
          code: credentials.code,
          gateway_address: credentials.gateway_address,
          reward_address: credentials.reward_address,
          device_type: deviceType,
          gpu_type: deviceModel,
          ip: ipAddress,
        },
      }).json() as {
        data: TRegistrationResponse;
        code: number;
      };

      if (response.data?.success && response.code !== 500) {
        this.deviceConfig = {
          deviceId: response.data.node_id || '',
          deviceName: response.data.name || '',
          rewardAddress: credentials.reward_address,
          gatewayAddress: credentials.gateway_address,
          key: credentials.key,
          code: credentials.code,
          isRegistered: true
        };
        
        await this.updateDeviceStatus(
          this.deviceConfig.deviceId, 
          this.deviceConfig.deviceName, 
          'connected', 
          this.deviceConfig.rewardAddress
        );
        
        await this.tunnelService.createSocket(
          this.deviceConfig.gatewayAddress, 
          this.deviceConfig.key, 
          this.deviceConfig.code
        );
        await this.tunnelService.connectSocket(response.data.node_id || '');
        
        this.heartbeat();
        
        this.logger.log('Device registration successful');
        return response.data;
      }
      
      this.logger.error(`Registration failed: ${JSON.stringify(response)}`);
      return {
        success: false,
        error: 'Registration failed',
        node_id: undefined,
        name: undefined
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Registration error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        node_id: undefined,
        name: undefined
      };
    }
  }

  async getDeviceType(): Promise<string> {
    return env().DEVICE_TYPE;
  }

  async getDeviceModel(): Promise<string> {
    return env().GPU_MODEL;
  }

  async getDeviceInfo(): Promise<string> {
    try {
      const [os, cpu, mem, graphics] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.graphics()
      ]);

      return JSON.stringify({
        os: `${os.distro} ${os.release} (${os.arch})`,
        cpu: `${cpu.manufacturer} ${cpu.brand} ${cpu.speed}GHz`,
        memory: `${(mem.total / 1024 / 1024 / 1024).toFixed(1)}GB`,
        graphics: R.map(
          R.applySpec({
            model: R.prop('model'),
            vram: R.ifElse(
              R.both(
                R.has('vram'), 
                R.pipe(R.prop('vram'), R.is(Number))
              ), 
              R.pipe(
                R.prop('vram'), 
                R.divide(R.__, 1024), 
                Math.round, 
                R.toString, 
                R.concat(R.__, 'GB')
              ), 
              R.always('Unknown')
            )
          }), 
          graphics.controllers
        )
      });
    } catch {
      return '{}';
    }
  }

  async heartbeat() {
    if (!this.deviceConfig.isRegistered) {
      this.logger.debug('Skipping heartbeat - device not registered');
      return;
    }

    try {
      const heartbeatData = await this.collectHeartbeatData();

      await got.post(`${this.deviceConfig.gatewayAddress}/node/heartbeat`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deviceConfig.key}`
        },
        json: heartbeatData,
      });

      this.logger.debug('Heartbeat sent successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Heartbeat failed: ${errorMessage}`);
      // Mark as not registered if heartbeat fails
      this.deviceConfig.isRegistered = false;
    }
  }

  private async collectHeartbeatData() {
    try {
      const [
        cpuLoad,
        memoryInfo,
        gpuInfo,
        ipAddress,
        deviceType,
        deviceModel,
        deviceInfo
      ] = await Promise.all([
        si.currentLoad().catch(() => ({ currentLoad: 0 })),
        si.mem().catch(() => ({ used: 0, total: 1 })),
        si.graphics().catch(() => ({ controllers: [{ utilizationGpu: 0 }] })),
        address(),
        this.getDeviceType(),
        this.getDeviceModel(),
        this.getDeviceInfo()
      ]);

      return createHeartbeatData({
        cpuLoad,
        memoryInfo,
        gpuInfo,
        ipAddress,
        deviceType,
        deviceModel,
        deviceInfo,
        deviceConfig: this.deviceConfig
      });
    } catch (error) {
      this.logger.error('Failed to collect heartbeat data');
      return {
        code: this.deviceConfig.code,
        cpu_usage: 0,
        memory_usage: 0,
        gpu_usage: 0,
        ip: '127.0.0.1',
        timestamp: new Date().toISOString(),
        type: 'unknown',
        model: 'unknown',
        device_info: '{}',
        gateway_url: this.deviceConfig.gatewayAddress,
        device_id: this.deviceConfig.deviceId
      };
    }
  }

  async updateDeviceStatus(
    deviceId: string, 
    name: string, 
    status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed", 
    rewardAddress: string
  ): Promise<TDeviceStatus> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      await this.deviceStatusRepository.updateDeviceStatus(
        conn, 
        deviceId, 
        name, 
        status, 
        rewardAddress, 
        this.deviceConfig.gatewayAddress, 
        this.deviceConfig.key, 
        this.deviceConfig.code
      );
      const updatedDevice = await this.deviceStatusRepository.findDeviceStatus(conn, deviceId);
      if (!updatedDevice) {
        throw new Error('Failed to update device status');
      }
      return updatedDevice;
    });
  }

  async getDeviceStatus(deviceId: string) {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceStatus(conn, deviceId);
    });
  }

  async markInactiveDevicesOffline(inactiveDuration: number): Promise<TDeviceStatus[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      const thresholdTime = new Date(Date.now() - inactiveDuration);
      await this.deviceStatusRepository.markDevicesOffline(conn, thresholdTime);
      const devices = await this.deviceStatusRepository.findDeviceList(conn);
      return devices.map(device => ({
        ...device,
        code: null,
        gateway_address: null,
        reward_address: null,
        key: null,
        up_time_start: null,
        up_time_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    });
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkOllamaStatus() {
    this.heartbeat();
    
    const { deviceId, deviceName, rewardAddress } = this.deviceConfig;

    if (!deviceId || !deviceName) {
      return;
    }

    try {
      const isOnline = await this.isOllamaOnline();
      const status = isOnline ? "connected" : "disconnected";
      
      if (isOnline) {
        await this.updateDeviceStatus(deviceId, deviceName, status, rewardAddress);
      } else {
        const inactiveDuration = 1000 * 60;
        await this.markInactiveDevicesOffline(inactiveDuration);
      }
    } catch (error) {
      const inactiveDuration = 1000 * 60;
      await this.markInactiveDevicesOffline(inactiveDuration);
    }
  }

  async isOllamaOnline(): Promise<boolean> {
    try {
      return await this.checkStatus();
    } catch (error) {
      return false;
    }
  }

  async getDeviceList(): Promise<TDeviceListItem[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceList(conn);
    });
  }

  async getCurrentDevice(): Promise<TDeviceStatus> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findCurrentDevice(conn);
    });
  }

  async getDeviceTasks(deviceId: string): Promise<TTaskResult[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDevicesTasks(conn, deviceId);
    });
  }

  async getDeviceEarnings(deviceId: string): Promise<TEarningResult[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceEarnings(conn, deviceId);
    });
  }

  async getGatewayStatus(): Promise<{
    isRegistered: boolean
  }> {
    return {
      isRegistered: this.deviceConfig.isRegistered
    };
  }

  async getDeviceId(): Promise<string> {
    return this.deviceConfig.deviceId;
  }

  async getDeviceName(): Promise<string> {
    return this.deviceConfig.deviceName;
  }

  async getRewardAddress(): Promise<string> {
    return this.deviceConfig.rewardAddress;
  }

  async getGatewayAddress(): Promise<string> {
    return this.deviceConfig.gatewayAddress;
  }

  async getKey(): Promise<string> {
    return this.deviceConfig.key;
  }

  async isRegistered(): Promise<boolean> {
    return this.deviceConfig.isRegistered;
  }
}

const DeviceStatusServiceProvider = {
  provide: DeviceStatusService,
  useClass: DefaultDeviceStatusService,
};

export default DeviceStatusServiceProvider;
