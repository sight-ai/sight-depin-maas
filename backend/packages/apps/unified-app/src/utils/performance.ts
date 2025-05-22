import * as os from 'os';
import * as fs from 'fs';

export interface PerformanceMetrics {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  uptime: number;
  backendStatus: 'running' | 'stopped' | 'unknown';
  responseTime?: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // 保留最近100个数据点

  constructor() {
    // 每30秒收集一次性能数据
    setInterval(() => {
      this.collectMetrics();
    }, 30000);
  }

  public async collectMetrics(): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    // 内存使用情况
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // CPU 信息
    const cpus = os.cpus();
    const cpuUsage = await this.getCpuUsage();

    // 检查后台服务状态
    const backendStatus = await this.checkBackendStatus();
    const responseTime = backendStatus === 'running' ? Date.now() - startTime : undefined;

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      cpu: {
        usage: cpuUsage,
        cores: cpus.length
      },
      uptime: process.uptime(),
      backendStatus,
      responseTime
    };

    // 添加到历史记录
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    return metrics;
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = Date.now();
        
        const totalTime = (endTime - startTime) * 1000; // 转换为微秒
        const totalUsage = endUsage.user + endUsage.system;
        const usage = Math.round((totalUsage / totalTime) * 100);
        
        resolve(Math.min(usage, 100)); // 限制在100%以内
      }, 100);
    });
  }

  private async checkBackendStatus(): Promise<'running' | 'stopped' | 'unknown'> {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:8716/api/v1/health', {
        method: 'GET',
        timeout: 3000
      });
      return response.ok ? 'running' : 'stopped';
    } catch (error) {
      return 'stopped';
    }
  }

  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getAverageMetrics(minutes: number = 5): Partial<PerformanceMetrics> | null {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    if (recentMetrics.length === 0) return null;

    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memory.percentage, 0) / recentMetrics.length;
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    const avgResponseTime = recentMetrics
      .filter(m => m.responseTime !== undefined)
      .reduce((sum, m) => sum + (m.responseTime || 0), 0) / recentMetrics.length;

    return {
      memory: {
        used: 0,
        total: 0,
        percentage: Math.round(avgMemoryUsage)
      },
      cpu: {
        usage: Math.round(avgCpuUsage),
        cores: recentMetrics[0].cpu.cores
      },
      responseTime: avgResponseTime || undefined
    };
  }

  public formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  public formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  public getHealthScore(): number {
    const latest = this.getLatestMetrics();
    if (!latest) return 0;

    let score = 100;
    
    // 内存使用率影响 (权重: 30%)
    if (latest.memory.percentage > 90) score -= 30;
    else if (latest.memory.percentage > 80) score -= 20;
    else if (latest.memory.percentage > 70) score -= 10;
    
    // CPU 使用率影响 (权重: 30%)
    if (latest.cpu.usage > 90) score -= 30;
    else if (latest.cpu.usage > 80) score -= 20;
    else if (latest.cpu.usage > 70) score -= 10;
    
    // 后台服务状态影响 (权重: 40%)
    if (latest.backendStatus === 'stopped') score -= 40;
    else if (latest.backendStatus === 'unknown') score -= 20;
    
    // 响应时间影响 (权重: 额外)
    if (latest.responseTime && latest.responseTime > 5000) score -= 10;
    else if (latest.responseTime && latest.responseTime > 3000) score -= 5;
    
    return Math.max(0, score);
  }

  public getHealthStatus(): 'excellent' | 'good' | 'fair' | 'poor' {
    const score = this.getHealthScore();
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }
}

export const performanceMonitor = new PerformanceMonitor();
