import { Injectable, Inject, Logger } from "@nestjs/common";
import * as R from 'ramda';
import { DeviceStatusRepository } from "./device-status.repository";
import { DatabaseTransactionConnection } from "slonik";
import { Cron, CronExpression } from '@nestjs/schedule';
import { OllamaService } from "@saito/ollama";
import got from "got-cjs";
import si from 'systeminformation';
import { address } from 'ip';
import {env} from '../env'
import { DeviceStatusService } from "./device-status.interface";
@Injectable()
export class DefaultDeviceStatusService implements DeviceStatusService{
  private readonly logger = new Logger(DefaultDeviceStatusService.name);
  private isRegistered = false; // 新增注册状态标志

  constructor(
    private readonly deviceStatusRepository: DeviceStatusRepository,
    @Inject(OllamaService)
    private readonly ollamaService: OllamaService
  ) {
  }
  async register() {
    const [ipAddress, deviceType, deviceModel] = await Promise.all([
      address(),
      this.getDeviceType(),
      this.getDeviceModel(),
    ]);
    const response: any = await got.post(`${env().GATEWAY_API_URL}/node/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env().GATEWAY_API_KEY}`
      },
      json: {
        node_id: env().NODE_ID,
        code: env().NODE_CODE,
        service_url: env().GATEWAY_API_URL,
        type: deviceType,
        model: deviceModel,
        ip: ipAddress,
      },
    });
    if (response.ok) {
      this.isRegistered = true;
      this.heartbeat()
      this.logger.log('Registration successful, starting heartbeat');
    }
  }

  async getDeviceType(): Promise<string> {
    try {
      const osInfo = await si.osInfo();
      const graphics = await si.graphics();

      // 判断是否为英伟达设备
      const isNvidia = graphics.controllers.some(c =>
        c.model?.toLowerCase().includes('nvidia')
      );

      if (isNvidia) return 'nvidia';
      return osInfo.platform === 'linux' ? 'linux' :
        osInfo.platform === 'darwin' ? 'mac' :
          osInfo.platform === 'windows' ? 'windows' : 'other';
    } catch {
      return 'unknown';
    }
  }

  async getDeviceModel(): Promise<string> {
    try {
      const graphics = await si.graphics();
      return graphics.controllers[0]?.model || 'Unknown';
    } catch {
      return 'Unknown';
    }
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
       graphics: R.map(R.applySpec({
          model: R.prop('model'),
          vram: R.ifElse(R.both(R.has('vram'), R.pipe(R.prop('vram'), R.is(Number))), R.pipe(R.prop('vram'), R.divide(R.__, 1024), Math.round, R.toString, R.concat(R.__, 'GB')), R.always('Unknown'))
        }), graphics.controllers)
      });
    } catch {
      return '{}';
    }
  }
  async heartbeat() {
    if (!this.isRegistered) return; // 确保只在注册后上报
    // 获取系统指标
    const [cpuLoad, memoryInfo, gpuInfo, ipAddress, deviceType, deviceModel, deviceInfo] = await Promise.all([
      si.currentLoad().catch(() => ({ currentLoad: 0 })),
      si.mem().catch(() => ({ used: 0, total: 1 })), // 避免除零错误
      si.graphics().catch(() => ({ controllers: [{ utilizationGpu: 0 }] })),
      address(),
      this.getDeviceType(),
      this.getDeviceModel(),
      this.getDeviceInfo()
    ]);
    const response = await got.post(`${env().GATEWAY_API_URL}/node/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env().GATEWAY_API_KEY}`
      },
      json: {
        node_id: env().NODE_ID,
        cpu_usage: Number(cpuLoad.currentLoad.toFixed(2)),  // 保留两位小数
        memory_usage: Number(
          ((memoryInfo.used / memoryInfo.total) * 100).toFixed(2)
        ),
        gpu_usage: Number(
          (gpuInfo.controllers[0]?.utilizationGpu || 0).toFixed(2)
        ),
        ip: ipAddress,
        timestamp: new Date().toISOString(),
        type: deviceType,
        model: deviceModel,
        device_info: deviceInfo,
        gateway_url: env().GATEWAY_API_URL
      },
    });
  }
  async updateDeviceStatus(deviceId: string, name: string, status: "online" | "offline") {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.updateDeviceStatus(conn, deviceId, name, status);
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
    this.heartbeat()
    const deviceId = env().OLLAMA_DEVICE_ID;
    const deviceName = env().OLLAMA_DEVICE_NAME

    if (!deviceId || !deviceName) {
      return;
    }

    try {
      const isOnline = await this.isOllamaOnline();
      const status: "online" | "offline" = isOnline ? "online" : "offline";
      R.ifElse(R.equals(true), async () => {
        await this.updateDeviceStatus(deviceId, deviceName, status);
      }, async () => {
        const inactiveDuration = 1000 * 60;
        await this.markInactiveDevicesOffline(inactiveDuration);
      })(isOnline);
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
}



const DeviceStatusServiceProvider = {
  provide: DeviceStatusService,
  useClass: DefaultDeviceStatusService,
};

export default DeviceStatusServiceProvider;
