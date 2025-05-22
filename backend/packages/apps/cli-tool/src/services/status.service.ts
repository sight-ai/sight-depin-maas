import fetch from 'node-fetch';
import * as si from 'systeminformation';
import { CliUI } from '../utils/cli-ui';
import { configManager } from '../utils/config';
import { AlignedTable, createStatusTable, createSimpleBox } from '../utils/table';

export interface SystemStatus {
  cpu: {
    model: string;
    cores: number;
    usage: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  gpu: {
    model: string;
    memory?: number;
    temperature?: number;
    usage?: number;
  }[];
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    interface: string;
    rx: number;
    tx: number;
  }[];
}

export interface ServiceStatus {
  backend: boolean;
  ollama: boolean;
  gateway: boolean;
}

export interface MinerStatus {
  deviceId: string;
  status: 'connected' | 'disconnected' | 'waiting' | 'in-progress' | 'failed';
  lastHeartbeat?: string;
  uptime?: number;
  tasksCompleted?: number;
  earnings?: number;
}

export class StatusService {
  private ui = new CliUI();
  private backendUrl = 'http://localhost:8716';
  private ollamaUrl = 'http://localhost:11434';

  // 获取系统状态
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const [cpuInfo, cpuLoad, cpuTemp, memInfo, gpuInfo, diskInfo, networkInfo] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
        si.cpuTemperature(),
        si.mem(),
        si.graphics(),
        si.fsSize(),
        si.networkStats()
      ]);

      // CPU 信息
      const cpu = {
        model: cpuInfo.brand || 'Unknown',
        cores: cpuInfo.cores || 0,
        usage: Math.round(cpuLoad.currentLoad || 0),
        temperature: cpuTemp.main || undefined
      };

      // 内存信息
      const memory = {
        total: memInfo.total,
        used: memInfo.used,
        free: memInfo.free,
        usage: Math.round((memInfo.used / memInfo.total) * 100)
      };

      // GPU 信息
      const gpu = gpuInfo.controllers.map(controller => ({
        model: controller.model || 'Unknown',
        memory: controller.vram || undefined,
        temperature: controller.temperatureGpu || undefined,
        usage: controller.utilizationGpu || undefined
      }));

      // 磁盘信息
      const mainDisk = diskInfo[0] || { size: 0, used: 0, available: 0 };
      const disk = {
        total: mainDisk.size,
        used: mainDisk.used,
        free: mainDisk.available,
        usage: Math.round((mainDisk.used / mainDisk.size) * 100)
      };

      // 网络信息
      const network = networkInfo.map(iface => ({
        interface: iface.iface || 'Unknown',
        rx: iface.rx_bytes || 0,
        tx: iface.tx_bytes || 0
      }));

      return { cpu, memory, gpu, disk, network };
    } catch (error: any) {
      this.ui.error(`获取系统状态失败: ${error.message}`);
      throw error;
    }
  }

  // 检查服务状态
  async getServiceStatus(): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      backend: false,
      ollama: false,
      gateway: false
    };

    // 检查后端服务
    try {
      const backendResponse = await fetch(`${this.backendUrl}/api/v1/health`, { timeout: 3000 });
      status.backend = backendResponse.ok;
    } catch (error) {
      status.backend = false;
    }

    // 检查 Ollama 服务
    try {
      const ollamaResponse = await fetch(`${this.ollamaUrl}/api/version`, { timeout: 3000 });
      status.ollama = ollamaResponse.ok;
    } catch (error) {
      status.ollama = false;
    }

    // 检查网关连接状态
    if (status.backend && configManager.hasRegistrationInfo()) {
      try {
        const gatewayResponse = await fetch(`${this.backendUrl}/api/v1/device-status/gateway-status`);
        if (gatewayResponse.ok) {
          const gatewayData = await gatewayResponse.json();
          status.gateway = gatewayData.connected || false;
        }
      } catch (error) {
        status.gateway = false;
      }
    }

    return status;
  }

  // 获取矿工状态
  async getMinerStatus(): Promise<MinerStatus | null> {
    try {
      const response = await fetch(`${this.backendUrl}/api/v1/miner/currentDevice`);

      if (response.ok) {
        const data = await response.json();
        return {
          deviceId: data.id || 'Unknown',
          status: data.status || 'disconnected',
          lastHeartbeat: data.last_heartbeat || data.updated_at,
          uptime: data.uptime,
          tasksCompleted: data.tasks_completed || 0,
          earnings: data.earnings || 0
        };
      }
    } catch (error: any) {
      this.ui.error(`获取矿工状态失败: ${error.message}`);
    }

    return null;
  }

  // 格式化字节数
  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // 格式化运行时间
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}天 ${hours}小时 ${minutes}分钟`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  }

  // 获取状态颜色
  getStatusColor(value: number, thresholds: { warning: number; critical: number }): 'success' | 'warning' | 'error' {
    if (value >= thresholds.critical) return 'error';
    if (value >= thresholds.warning) return 'warning';
    return 'success';
  }

  // 实时监控
  async startMonitoring(intervalSeconds: number = 5): Promise<void> {
    this.ui.info(`开始实时监控 (每 ${intervalSeconds} 秒更新)`);
    this.ui.info('按 Ctrl+C 停止监控');

    const monitor = async () => {
      try {
        this.ui.clear();

        // 显示标题
        this.ui.showTitle('🔍 Sight AI 实时状态监控');

        // 获取状态信息
        const [systemStatus, serviceStatus, minerStatus] = await Promise.all([
          this.getSystemStatus(),
          this.getServiceStatus(),
          this.getMinerStatus()
        ]);

        // 显示服务状态
        this.ui.showStatusBox('🔧 服务状态', [
          {
            label: '后端服务',
            value: serviceStatus.backend ? '运行中' : '已停止',
            status: serviceStatus.backend ? 'success' : 'error'
          },
          {
            label: 'Ollama 服务',
            value: serviceStatus.ollama ? '运行中' : '已停止',
            status: serviceStatus.ollama ? 'success' : 'error'
          },
          {
            label: '网关连接',
            value: serviceStatus.gateway ? '已连接' : '未连接',
            status: serviceStatus.gateway ? 'success' : 'warning'
          }
        ]);

        // 显示系统状态
        this.ui.showStatusBox('💻 系统状态', [
          {
            label: 'CPU 使用率',
            value: `${systemStatus.cpu.usage}%`,
            status: this.getStatusColor(systemStatus.cpu.usage, { warning: 70, critical: 90 })
          },
          {
            label: '内存使用率',
            value: `${systemStatus.memory.usage}% (${this.formatBytes(systemStatus.memory.used)}/${this.formatBytes(systemStatus.memory.total)})`,
            status: this.getStatusColor(systemStatus.memory.usage, { warning: 80, critical: 95 })
          },
          {
            label: '磁盘使用率',
            value: `${systemStatus.disk.usage}% (${this.formatBytes(systemStatus.disk.used)}/${this.formatBytes(systemStatus.disk.total)})`,
            status: this.getStatusColor(systemStatus.disk.usage, { warning: 80, critical: 95 })
          }
        ]);

        // 显示矿工状态
        if (minerStatus) {
          this.ui.showStatusBox('⛏️ 矿工状态', [
            {
              label: '设备状态',
              value: minerStatus.status,
              status: minerStatus.status === 'connected' ? 'success' : 'warning'
            },
            {
              label: '设备 ID',
              value: minerStatus.deviceId.substring(0, 8) + '...'
            },
            {
              label: '完成任务',
              value: `${minerStatus.tasksCompleted || 0} 个`
            },
            {
              label: '累计收益',
              value: `${minerStatus.earnings || 0} SAITO`
            }
          ]);
        }

        console.log(`\n最后更新: ${new Date().toLocaleString()}`);

      } catch (error: any) {
        this.ui.error(`监控更新失败: ${error.message}`);
      }
    };

    // 立即执行一次
    await monitor();

    // 设置定时器
    const interval = setInterval(monitor, intervalSeconds * 1000);

    // 监听退出信号
    process.on('SIGINT', () => {
      clearInterval(interval);
      this.ui.info('\n监控已停止');
      process.exit(0);
    });
  }
}
