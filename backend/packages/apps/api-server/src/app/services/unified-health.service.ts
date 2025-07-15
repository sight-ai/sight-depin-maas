import { Injectable, Logger } from '@nestjs/common';

/**
 * 统一健康检查服务
 * 
 * 职责：
 * 1. 提供统一的健康检查接口
 * 2. 支持多种健康检查格式
 * 3. 消除控制器中的重复代码
 * 4. 遵循单一职责原则
 */
@Injectable()
export class UnifiedHealthService {
  private readonly logger = new Logger(UnifiedHealthService.name);
  private readonly startTime = Date.now();

  /**
   * 获取简单的健康状态
   * 用于 /healthz 接口
   */
  getSimpleHealth(): string {
    return 'OK';
  }

  /**
   * 获取详细的健康状态
   * 用于 /api/v1/health 接口
   */
  getDetailedHealth(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * 获取应用信息
   * 用于根路径 / 接口
   */
  getAppInfo(): string {
    return 'saito API';
  }
}
