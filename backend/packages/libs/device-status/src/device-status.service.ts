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

// Create heartbeat data for the new API format
const createHeartbeatData = (data: any): any => {
  // 提取CPU、内存、GPU等信息
  const cpuUsage = data.cpuLoad?.currentLoad !== undefined ? formatNumber(data.cpuLoad.currentLoad) : 0;
  const memoryUsage = data.memoryInfo ? formatNumber((data.memoryInfo.used / data.memoryInfo.total) * 100) : 0;
  const gpuUsage = data.gpuInfo?.controllers?.[0]?.utilizationGpu !== undefined
    ? formatNumber(data.gpuInfo.controllers[0].utilizationGpu)
    : 0;

  // 从设备信息字符串中解析JSON
  let deviceInfoObj: any = {};
  try {
    if (typeof data.deviceInfo === 'string') {
      deviceInfoObj = JSON.parse(data.deviceInfo);
    }
  } catch (e) {
    deviceInfoObj = {};
  }

  // 提取CPU信息 - 优先使用系统信息API获取的数据
  let cpuModel = '';
  if (data.cpuInfo) {
    // 使用系统信息API获取的CPU信息
    cpuModel = `${data.cpuInfo.manufacturer || ''} ${data.cpuInfo.brand || ''} ${data.cpuInfo.speed ? data.cpuInfo.speed + 'GHz' : ''}`.trim();
  } else {
    // 回退到设备信息字符串中的CPU信息
    cpuModel = typeof deviceInfoObj.cpu === 'string' ? deviceInfoObj.cpu : '';
  }

  // 提取内存信息 - 优先使用系统信息API获取的数据
  let memoryGB = 0;
  if (data.memoryInfo?.total) {
    // 使用系统信息API获取的内存信息（转换为GB）
    memoryGB = formatNumber(data.memoryInfo.total / 1024 / 1024 / 1024);
  } else {
    // 回退到设备信息字符串中的内存信息
    const memoryStr = typeof deviceInfoObj.memory === 'string' ? deviceInfoObj.memory : '0GB';
    memoryGB = parseFloat(memoryStr.replace('GB', '')) || 0;
  }

  // 提取GPU信息 - 优先使用系统信息API获取的数据
  let gpuModel = '';
  let gpuCount = 0;
  let gpuMemoryGB = 0;

  if (data.gpuInfo?.controllers && data.gpuInfo.controllers.length > 0) {
    // 使用系统信息API获取的GPU信息
    gpuModel = data.gpuInfo.controllers[0].model || '';
    gpuCount = data.gpuInfo.controllers.length || 0;
    gpuMemoryGB = data.gpuInfo.controllers[0].memoryTotal
      ? formatNumber(data.gpuInfo.controllers[0].memoryTotal / 1024) // 转换为GB
      : 0;
  } else {
    // 回退到设备信息字符串中的GPU信息
    const graphics = Array.isArray(deviceInfoObj.graphics) ? deviceInfoObj.graphics : [];
    gpuModel = graphics[0]?.model || '';
    gpuCount = graphics.length || 0;
    const gpuMemoryStr = graphics[0]?.vram || '0GB';
    gpuMemoryGB = parseFloat(gpuMemoryStr.replace('GB', '')) || 0;
  }

  // 提取操作系统信息 - 优先使用系统信息API获取的数据
  let osInfoStr = '';
  if (data.osInfo) {
    // 使用系统信息API获取的操作系统信息
    osInfoStr = `${data.osInfo.distro || ''} ${data.osInfo.release || ''} ${data.osInfo.arch || ''}`.trim();
  } else {
    // 回退到设备信息字符串中的操作系统信息
    osInfoStr = typeof deviceInfoObj.os === 'string' ? deviceInfoObj.os : '';
  }

  // 提取磁盘信息 - 优先使用系统信息API获取的数据
  let diskTotalGB = 0;
  if (data.diskInfo) {
    // 如果有多个磁盘，累加总容量
    if (Array.isArray(data.diskInfo)) {
      diskTotalGB = data.diskInfo.reduce((total: number, disk: {size: number}) => {
        return total + (disk.size ? disk.size / 1024 / 1024 / 1024 : 0);
      }, 0);
      diskTotalGB = formatNumber(diskTotalGB);
    } else {
      // 单个磁盘信息
      diskTotalGB = data.diskInfo.size ? formatNumber(data.diskInfo.size / 1024 / 1024 / 1024) : 0;
    }
  }

  return {
    code: data.deviceConfig.code,
    cpu_usage: cpuUsage,
    memory_usage: memoryUsage,
    gpu_usage: gpuUsage,
    ip: data.ipAddress,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: data.deviceType,
    model: data.deviceModel,
    device_info: {
      cpu_model: cpuModel,
      cpu_cores: data.cpuInfo?.cores || 0,
      cpu_threads: data.cpuInfo?.physicalCores || 0,
      ram_total: memoryGB,
      gpu_model: gpuModel,
      gpu_count: gpuCount,
      gpu_memory: gpuMemoryGB,
      disk_total: diskTotalGB,
      os_info: osInfoStr
    }
  };
};

// Create legacy heartbeat data for backward compatibility
const createLegacyHeartbeatData = (data: any): any => {
  // 提取CPU、内存、GPU等信息
  const cpuUsage = data.cpuLoad?.currentLoad !== undefined ? formatNumber(data.cpuLoad.currentLoad) : 0;
  const memoryUsage = data.memoryInfo ? formatNumber((data.memoryInfo.used / data.memoryInfo.total) * 100) : 0;

  // 提取GPU信息
  let gpuUsage = 0;
  let gpuTemp = 0;

  if (data.gpuInfo?.controllers && data.gpuInfo.controllers.length > 0) {
    // 使用第一个GPU的信息
    const primaryGpu = data.gpuInfo.controllers[0];
    gpuUsage = primaryGpu.utilizationGpu !== undefined ? formatNumber(primaryGpu.utilizationGpu) : 0;
    gpuTemp = primaryGpu.temperatureGpu !== undefined ? formatNumber(primaryGpu.temperatureGpu) : 0;
  }

  // 提取网络信息
  let networkIn = 0;
  let networkOut = 0;

  if (data.networkInfo) {
    if (Array.isArray(data.networkInfo) && data.networkInfo.length > 0) {
      // 如果是数组，使用第一个网络接口的信息
      const primaryNetwork = data.networkInfo[0];
      networkIn = primaryNetwork.rx_sec !== undefined ? formatNumber(primaryNetwork.rx_sec / 1024) : 0; // 转换为kbps
      networkOut = primaryNetwork.tx_sec !== undefined ? formatNumber(primaryNetwork.tx_sec / 1024) : 0; // 转换为kbps
    } else {
      // 单个网络接口信息
      networkIn = data.networkInfo.rx_sec !== undefined ? formatNumber(data.networkInfo.rx_sec / 1024) : 0; // 转换为kbps
      networkOut = data.networkInfo.tx_sec !== undefined ? formatNumber(data.networkInfo.tx_sec / 1024) : 0; // 转换为kbps
    }
  }

  // 获取系统启动时间
  let uptimeSeconds = process.uptime();
  if (data.osInfo?.uptime) {
    // 如果有系统信息中的启动时间，优先使用
    uptimeSeconds = data.osInfo.uptime;
  }

  return {
    node_id: data.deviceConfig.deviceId,
    status: 'connected',
    cpu_usage_percent: cpuUsage,
    ram_usage_percent: memoryUsage,
    gpu_usage_percent: gpuUsage,
    gpu_temperature: gpuTemp,
    network_in_kbps: networkIn,
    network_out_kbps: networkOut,
    uptime_seconds: uptimeSeconds,
    model: data.deviceModel
  };
};

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

      // Updated to use the new API endpoint according to the documentation
      const response = await got.post(`${credentials.gateway_address}/node/register`, {
        headers: {
          'Content-Type': 'application/json'
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
        success: boolean;
        data?: {
          node_id: string;
          status: string;
          device_type: string;
          reward_address: string;
          name?: string;
        };
        message?: string;
      };

      if (response.success && response.data) {
        this.deviceConfig = {
          deviceId: response.data.node_id || '',
          deviceName: response.data.name || 'Device',
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

        // Create socket connection to the gateway
        await this.tunnelService.createSocket(
          this.deviceConfig.gatewayAddress,
          this.deviceConfig.key,
          this.deviceConfig.code
        );
        await this.tunnelService.connectSocket(response.data.node_id || '');

        // Start heartbeat reporting
        this.heartbeat();

        this.logger.log('Device registration successful');
        return {
          success: true,
          error: '',
          node_id: response.data.node_id,
          name: response.data.name
        };
      }

      this.logger.error(`Registration failed: ${JSON.stringify(response)}`);
      return {
        success: false,
        error: response.message || 'Registration failed',
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
      // 获取所有系统信息
      const [
        cpuLoad,
        cpuInfo,
        memoryInfo,
        gpuInfo,
        diskInfo,
        networkInfo,
        osInfo,
        ipAddress,
        deviceType,
        deviceModel,
        deviceInfo
      ] = await Promise.all([
        si.currentLoad().catch((err) => {
          this.logger.warn(`Failed to get CPU load: ${err.message}`);
          return { currentLoad: 0 };
        }),
        si.cpu().catch((err) => {
          this.logger.warn(`Failed to get CPU info: ${err.message}`);
          return {
            cores: 0,
            physicalCores: 0,
            manufacturer: '',
            brand: '',
            speed: 0,
            speedMin: 0,
            speedMax: 0,
            cache: { l1d: 0, l1i: 0, l2: 0, l3: 0 }
          };
        }),
        si.mem().catch((err) => {
          this.logger.warn(`Failed to get memory info: ${err.message}`);
          return { used: 0, total: 1, free: 0, active: 0, available: 0, swaptotal: 0, swapused: 0, swapfree: 0 };
        }),
        si.graphics().catch((err) => {
          this.logger.warn(`Failed to get GPU info: ${err.message}`);
          return {
            controllers: [],
            displays: []
          };
        }),
        si.fsSize().catch((err) => {
          this.logger.warn(`Failed to get disk info: ${err.message}`);
          return [];
        }),
        si.networkStats().catch((err) => {
          this.logger.warn(`Failed to get network info: ${err.message}`);
          return [];
        }),
        si.osInfo().catch((err) => {
          this.logger.warn(`Failed to get OS info: ${err.message}`);
          return {
            distro: '',
            release: '',
            arch: '',
            platform: '',
            hostname: '',
            uptime: 0
          };
        }),
        address(),
        this.getDeviceType(),
        this.getDeviceModel(),
        this.getDeviceInfo()
      ]);

      // 构建心跳数据
      const heartbeatData = {
        cpuLoad,
        cpuInfo,
        memoryInfo,
        gpuInfo,
        diskInfo,
        networkInfo,
        osInfo,
        ipAddress,
        deviceType,
        deviceModel,
        deviceInfo,
        deviceConfig: this.deviceConfig
      };

      // 记录详细的系统信息日志
      this.logger.debug('Collected system information for heartbeat');

      // CPU信息
      this.logger.debug(`CPU: ${cpuInfo.manufacturer} ${cpuInfo.brand} (${cpuInfo.cores} cores, ${cpuInfo.physicalCores} threads)`);
      this.logger.debug(`CPU Load: ${formatNumber(cpuLoad.currentLoad)}%`);

      // 内存信息
      const memUsedGB = formatNumber(memoryInfo.used / 1024 / 1024 / 1024);
      const memTotalGB = formatNumber(memoryInfo.total / 1024 / 1024 / 1024);
      this.logger.debug(`Memory: ${memUsedGB}GB / ${memTotalGB}GB (${formatNumber((memoryInfo.used / memoryInfo.total) * 100)}%)`);

      // GPU信息
      if (gpuInfo.controllers && gpuInfo.controllers.length > 0) {
        gpuInfo.controllers.forEach((controller, index) => {
          this.logger.debug(`GPU ${index + 1}: ${controller.model || 'Unknown'}`);
          if (controller.utilizationGpu !== undefined) {
            this.logger.debug(`GPU ${index + 1} Usage: ${formatNumber(controller.utilizationGpu)}%`);
          }
          if (controller.temperatureGpu !== undefined) {
            this.logger.debug(`GPU ${index + 1} Temperature: ${formatNumber(controller.temperatureGpu)}°C`);
          }
          if (controller.memoryTotal !== undefined) {
            this.logger.debug(`GPU ${index + 1} Memory: ${formatNumber(controller.memoryTotal / 1024)}GB`);
          }
        });
      } else {
        this.logger.debug('GPU: Not available');
      }

      // 磁盘信息
      if (Array.isArray(diskInfo) && diskInfo.length > 0) {
        diskInfo.forEach((disk: any, index) => {
          const sizeGB = formatNumber(disk.size / 1024 / 1024 / 1024);
          const usedGB = formatNumber(disk.used / 1024 / 1024 / 1024);
          this.logger.debug(`Disk ${index + 1}: ${disk.fs}, ${usedGB}GB / ${sizeGB}GB (${formatNumber(disk.use)}%)`);
        });
      } else if (diskInfo && typeof diskInfo === 'object' && 'size' in diskInfo) {
        const sizeGB = formatNumber((diskInfo as any).size / 1024 / 1024 / 1024);
        const usedGB = formatNumber((diskInfo as any).used / 1024 / 1024 / 1024);
        this.logger.debug(`Disk: ${usedGB}GB / ${sizeGB}GB (${formatNumber((diskInfo as any).use)}%)`);
      } else {
        this.logger.debug('Disk: Not available');
      }

      // 网络信息
      if (Array.isArray(networkInfo) && networkInfo.length > 0) {
        networkInfo.forEach((network: any, index) => {
          this.logger.debug(`Network ${index + 1} (${network.iface}): In ${formatNumber(network.rx_sec / 1024)}kbps, Out ${formatNumber(network.tx_sec / 1024)}kbps`);
        });
      } else if (networkInfo && typeof networkInfo === 'object' && 'rx_sec' in networkInfo) {
        this.logger.debug(`Network: In ${formatNumber((networkInfo as any).rx_sec / 1024)}kbps, Out ${formatNumber((networkInfo as any).tx_sec / 1024)}kbps`);
      } else {
        this.logger.debug('Network: Not available');
      }

      // 操作系统信息
      this.logger.debug(`OS: ${osInfo.distro} ${osInfo.release} (${osInfo.arch})`);
      // 获取系统运行时间
      const uptime = (osInfo as any).uptime || process.uptime();
      this.logger.debug(`Uptime: ${formatNumber(uptime / 3600)} hours`);

      // 发送到新的API端点
      const newHeartbeatData = createHeartbeatData(heartbeatData);
      await got.post(`${this.deviceConfig.gatewayAddress}/node/heartbeat/new`, {
        headers: {
          'Content-Type': 'application/json'
        },
        json: newHeartbeatData,
      });

      // 同时发送到旧的API端点以保持向后兼容
      const legacyHeartbeatData = createLegacyHeartbeatData(heartbeatData);
      await got.post(`${this.deviceConfig.gatewayAddress}/node/heartbeat`, {
        headers: {
          'Content-Type': 'application/json'
        },
        json: legacyHeartbeatData,
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
