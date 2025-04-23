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
  ModelOfMiner
} from "@saito/models";

const STATUS_CHECK_TIMEOUT = 2000;

// Utility functions
const formatNumber = (value: number) => Number(value.toFixed(2));

const createHeartbeatData = R.applySpec({
  code: R.path(['deviceConfig', 'code']),
  cpu_usage: R.pipe(
    R.path(['cpuLoad', 'currentLoad']) as (data: ModelOfMiner<'HeartbeatData'>) => number | undefined,
    R.defaultTo(0),
    formatNumber
  ),
  memory_usage: R.pipe(
    R.prop('memoryInfo') as (data: ModelOfMiner<'HeartbeatData'>) => { used: number; total: number },
    ({ used, total }) => formatNumber((used / total) * 100)
  ),
  gpu_usage: R.pipe(
    R.path(['gpuInfo', 'controllers', 0, 'utilizationGpu']) as (data: ModelOfMiner<'HeartbeatData'>) => number | undefined,
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
  private deviceConfig: ModelOfMiner<'DeviceConfig'> = {
    deviceId: '24dea62e-95df-4549-b3ba-c9522cd5d5c1',
    deviceName: 'local_device_name',
    rewardAddress: '',
    gatewayAddress: '',
    key: '',
    code: '',
    isRegistered: false
  };

  constructor(
    private readonly deviceStatusRepository: DeviceStatusRepository,
    @Inject(forwardRef(() => TunnelService))
    private readonly tunnelService: TunnelService
  ) {
    this.initFromDatabase();
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

  async register(credentials: ModelOfMiner<'DeviceCredentials'>): Promise<ModelOfMiner<'RegistrationResponse'>> {
    try {
      const [ipAddress, deviceType, deviceModel] = await Promise.all([
        address(),
        this.getDeviceType(),
        this.getDeviceModel(),
      ]);
      this.logger.debug(JSON.stringify(credentials));
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
        data: ModelOfMiner<'RegistrationResponse'>;
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
        this.logger.debug(`Device registered: ${JSON.stringify(this.deviceConfig)}`);
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

  async updateDeviceStatus(
    deviceId: string, 
    name: string, 
    status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed", 
    rewardAddress: string
  ): Promise<ModelOfMiner<'DeviceStatusModule'>> {
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

  async getDeviceStatus(deviceId: string): Promise<ModelOfMiner<'DeviceStatusModule'> | null> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceStatus(conn, deviceId);
    });
  }

  async markInactiveDevicesOffline(inactiveDuration: number): Promise<ModelOfMiner<'DeviceStatusModule'>[]> {
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

  async getDeviceList(): Promise<ModelOfMiner<'DeviceListItem'>[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceList(conn);
    });
  }

  async getCurrentDevice(): Promise<ModelOfMiner<'DeviceStatusModule'>> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findCurrentDevice(conn);
    });
  }

  async getDeviceTasks(deviceId: string): Promise<ModelOfMiner<'TaskResult'>[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDevicesTasks(conn, deviceId);
    });
  }

  async getDeviceEarnings(deviceId: string): Promise<ModelOfMiner<'EarningResult'>[]> {
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

  async checkStatus(): Promise<boolean> {
    try {
      const url = new URL(`api/version`, env().OLLAMA_API_URL);
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

  async isOllamaOnline(): Promise<boolean> {
    try {
      return await this.checkStatus();
    } catch (error) {
      return false;
    }
  }

  async heartbeat() {
    if (!this.deviceConfig.isRegistered) {
      this.logger.debug('Skipping heartbeat - device not registered');
      return;
    }

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

      const heartbeatData = createHeartbeatData({
        cpuLoad,
        memoryInfo,
        gpuInfo,
        ipAddress,
        deviceType,
        deviceModel,
        deviceInfo,
        deviceConfig: this.deviceConfig
      });

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
      // this.deviceConfig.isRegistered = false;
    }
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
}

const DeviceStatusServiceProvider = {
  provide: DeviceStatusService,
  useClass: DefaultDeviceStatusService,
};

export default DeviceStatusServiceProvider;
