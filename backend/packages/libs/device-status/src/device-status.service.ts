import { Injectable, Inject, Logger } from "@nestjs/common";
import { DeviceStatusRepository } from "./device-status.repository";
import { DatabaseTransactionConnection } from "slonik";
import { Cron, CronExpression } from '@nestjs/schedule';
import { OllamaService } from "@saito/ollama";
import got from "got-cjs";
import si from 'systeminformation';
import { address } from 'ip';
@Injectable()
export class DeviceStatusService {
  private readonly logger = new Logger(DeviceStatusService.name);

  constructor(
    private readonly deviceStatusRepository: DeviceStatusRepository,
    @Inject(OllamaService)
    private readonly ollamaService: OllamaService
  ) {
    this.register()
  }
  async register() {
    const [cpuLoad, memoryInfo, gpuInfo, ipAddress, deviceType, deviceModel, deviceInfo] = await Promise.all([
      si.currentLoad().catch(() => ({ currentLoad: 0 })),
      si.mem().catch(() => ({ used: 0, total: 1 })), // 避免除零错误
      si.graphics().catch(() => ({ controllers: [{ utilizationGpu: 0 }] })),
      address(),
      this.getDeviceType(),
      this.getDeviceModel(),
      this.getDeviceInfo()
    ]);
    const response = await got.post(`${process.env['GATEWAY_API_URL']}/node/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env['GATEWAY_API_KEY']}`
      },
      json: {
        node_id: process.env['NODE_ID'],
        code: process.env['NODE_CODE'],
        service_url: process.env['GATEWAY_API_URL'],
        type: deviceType,
        model: deviceModel,
        device_info: deviceInfo,
        ip: ipAddress,
      },
    });
    this.heartbeat()
    console.log(response.body);
  }
  
private async getDeviceType(): Promise<string> {
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

private async getDeviceModel(): Promise<string> {
  try {
    const graphics = await si.graphics();
    return graphics.controllers[0]?.model || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

private async getDeviceInfo(): Promise<string> {
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
      graphics: graphics.controllers.map(c => ({
        model: c.model,
        vram: c.vram ? `${Math.round(c.vram / 1024)}GB` : 'Unknown'
      }))
    });
  } catch {
    return '{}';
  }
}
  async heartbeat() {
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
    const response = await got.post(`${process.env['GATEWAY_API_URL']}/node/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env['GATEWAY_API_KEY']}`
      },
      json: {
        node_id: process.env['NODE_ID'],
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
        gateway_url: process.env['GATEWAY_API_URL']
      },
    });
    console.log(response.body,  {
      node_id: process.env['NODE_ID'],
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
      device_info: deviceInfo
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
    const deviceId = process.env['OLLAMA_DEVICE_ID'];
    const deviceName = process.env['OLLAMA_DEVICE_NAME']

    if (!deviceId || !deviceName) {
      return;
    }

    try {
      const isOnline = await this.isOllamaOnline();
      const status: "online" | "offline" = isOnline ? "online" : "offline";
      if (isOnline) {
        await this.updateDeviceStatus(deviceId, deviceName, status);
      } else {
        const inactiveDuration = 1000 * 60;
        this.markInactiveDevicesOffline(inactiveDuration)
      }
    } catch (error) {
      const inactiveDuration = 1000 * 60;
      this.markInactiveDevicesOffline(inactiveDuration)
    }
  }

  private async isOllamaOnline(): Promise<boolean> {
    try {
      return await this.ollamaService.checkStatus();
    } catch (error) {
      return false;
    }
  }
}
