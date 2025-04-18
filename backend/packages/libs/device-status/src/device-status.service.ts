import { Injectable, Inject, Logger, forwardRef } from "@nestjs/common";
import * as R from 'ramda';
import { DeviceStatusRepository } from "./device-status.repository";
import { DatabaseTransactionConnection } from "slonik";
import { Cron, CronExpression } from '@nestjs/schedule';
import { OllamaService } from "@saito/ollama";
import got from "got-cjs";
import si from 'systeminformation';
import { address } from 'ip';
import { env } from '../env'
import { DeviceStatusService } from "./device-status.interface";
import { TunnelService } from "@saito/tunnel";
import { DeviceListItem, TaskResult, EarningResult, DeviceCredentials } from "@saito/models";

type DeviceConfig = {
  deviceId: string;
  deviceName: string;
  rewardAddress: string;
  gatewayAddress: string;
  key: string;
  code: string;
  isRegistered: boolean;
}

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

  constructor(
    private readonly deviceStatusRepository: DeviceStatusRepository,
    @Inject(forwardRef(() => OllamaService))
    private readonly ollamaService: OllamaService,
    private readonly tunnelService: TunnelService
  ) {
    // Initialize from database if available
    this.initFromDatabase();
  }

  private async initFromDatabase() {
    try {
      const currentDevice = await this.getCurrentDevice();
      if (currentDevice && currentDevice.status === 'online') {
        this.deviceConfig = {
          deviceId: currentDevice.deviceId,
          deviceName: currentDevice.name,
          rewardAddress: currentDevice.rewardAddress || '',
          gatewayAddress: '', // Will be retrieved separately
          key: '',
          code: '',
          isRegistered: true
        };
        
        // Attempt to get gateway key and code
        await this.retrieveGatewayCredentials();
      }
    } catch (error) {
      this.logger.error('Failed to initialize device from database');
    }
  }

  private async retrieveGatewayCredentials() {
    try {
      await this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
        const deviceStatus = await this.deviceStatusRepository.findDeviceStatus(conn, this.deviceConfig.deviceId);
        
        if (deviceStatus) {
          this.deviceConfig.gatewayAddress = deviceStatus.gatewayAddress;
          // Retrieve key and code from deviceStatus if needed
          // This might require extending the findDeviceStatus method to include these fields
        }
      });
    } catch (error) {
      this.logger.error('Failed to retrieve gateway credentials');
    }
  }

  async register(body: { code: string, gateway_address: string, reward_address: string, key: string }): Promise<{
    success: boolean,
    error: string
  }> {
    try {
      const [ipAddress, deviceType, deviceModel] = await Promise.all([
        address(),
        this.getDeviceType(),
        this.getDeviceModel(),
      ]);

      this.logger.debug(`Registering device with gateway: ${body.gateway_address}`);

      const response = await got.post(`${body.gateway_address}/node/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${body.key}`
        },
        json: {
          code: body.code,
          gateway_address: body.gateway_address,
          reward_address: body.reward_address,
          device_type: deviceType,
          gpu_type: deviceModel,
          ip: ipAddress,
        },
      }).json() as {
        data: {
          success: boolean,
          error: string,
          node_id: string,
          name: string,
        },
        code: number
      };

      if (response.data.success && response.code !== 500) {
        this.deviceConfig = {
          ...this.deviceConfig,
          deviceId: response.data.node_id,
          deviceName: response.data.name,
          rewardAddress: body.reward_address,
          gatewayAddress: body.gateway_address,
          key: body.key,
          code: body.code,
          isRegistered: true
        };
        
        await this.updateDeviceStatus(
          this.deviceConfig.deviceId, 
          this.deviceConfig.deviceName, 
          'online', 
          this.deviceConfig.rewardAddress
        );
        
        await this.tunnelService.createSocket(this.deviceConfig.gatewayAddress, this.deviceConfig.key, this.deviceConfig.code);
        await this.tunnelService.connectSocket(response.data.node_id);
        
        this.heartbeat();
        
        this.logger.log('Device registration successful');
        return response.data;
      } else {
        this.logger.error(`Registration failed: ${response.data.error}`);
        return response.data;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Registration error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
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
        method: 'POST',
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
      const [cpuLoad, memoryInfo, gpuInfo, ipAddress, deviceType, deviceModel, deviceInfo] = await Promise.all([
        si.currentLoad().catch(() => ({ currentLoad: 0 })),
        si.mem().catch(() => ({ used: 0, total: 1 })),
        si.graphics().catch(() => ({ controllers: [{ utilizationGpu: 0 }] })),
        address(),
        this.getDeviceType(),
        this.getDeviceModel(),
        this.getDeviceInfo()
      ]);

      const getPercentage = (value: number) => Number(value.toFixed(2));

      return {
        code: this.deviceConfig.code,
        cpu_usage: getPercentage(cpuLoad.currentLoad),
        memory_usage: getPercentage((memoryInfo.used / memoryInfo.total) * 100),
        gpu_usage: getPercentage(gpuInfo.controllers[0]?.utilizationGpu || 0),
        ip: ipAddress,
        timestamp: new Date().toISOString(),
        type: deviceType,
        model: deviceModel,
        device_info: deviceInfo,
        gateway_url: this.deviceConfig.gatewayAddress
      };
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
        gateway_url: this.deviceConfig.gatewayAddress
      };
    }
  }

  async updateDeviceStatus(deviceId: string, name: string, status: "online" | "offline", rewardAddress: string) {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.updateDeviceStatus(
        conn, 
        deviceId, 
        name, 
        status, 
        rewardAddress, 
        this.deviceConfig.gatewayAddress, 
        this.deviceConfig.key, 
        this.deviceConfig.code
      );
    });
  }

  async getDeviceStatus(deviceId: string) {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceStatus(conn, deviceId);
    });
  }

  async markInactiveDevicesOffline(inactiveDuration: number) {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      const thresholdTime = new Date(Date.now() - inactiveDuration);
      return this.deviceStatusRepository.markDevicesOffline(conn, thresholdTime);
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkOllamaStatus() {
    this.heartbeat();
    
    const { deviceId, deviceName, rewardAddress } = this.deviceConfig;

    if (!deviceId || !deviceName) {
      return;
    }

    try {
      const isOnline = await this.isOllamaOnline();
      const status: "online" | "offline" = isOnline ? "online" : "offline";
      
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
      return await this.ollamaService.checkStatus();
    } catch (error) {
      return false;
    }
  }

  async getDeviceList(): Promise<DeviceListItem[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceList(conn);
    });
  }

  async getCurrentDevice(): Promise<{
    deviceId: string,
    name: string,
    status: "online" | "offline",
    rewardAddress: string | null
  }> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      const device = await this.deviceStatusRepository.findCurrentDevice(conn);
      // Map back to the interface format
      return {
        deviceId: device.deviceId,
        name: device.name,
        status: device.status,
        rewardAddress: device.rewardAddress
      };
    });
  }

  // async getDeviceTasks(deviceId: string): Promise<TaskResult[]> {
  //   return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
  //     const tasks = await this.deviceStatusRepository.findDevicesTasks(conn, deviceId);
  //     return tasks;
  //   });
  // }

  // async getDeviceEarnings(deviceId: string): Promise<EarningResult[]> {
  //   return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
  //     const earnings = await this.deviceStatusRepository.findDeviceEarnings(conn, deviceId);
  //     return earnings;
  //   });
  // }

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
