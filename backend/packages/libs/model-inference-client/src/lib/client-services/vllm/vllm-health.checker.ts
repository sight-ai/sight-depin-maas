import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IHealthChecker } from '../contracts/request-handler.contract';

/**
 * vLLM 健康检查器
 * 专门负责检查 vLLM 服务的健康状态
 *
 * 实现 IHealthChecker 
 */
@Injectable()
export class VllmHealthChecker {
  private readonly logger = new Logger(VllmHealthChecker.name);

  /**
   * 执行健康检查
   */
  async performHealthCheck(baseUrl: string): Promise<boolean> {
    try {
      const config = this.getHttpConfig();
      const response = await axios.get(`${baseUrl}/v1/models`, {
        ...config,
        timeout: 5000
      });
      
      const isHealthy = this.isSuccessResponse(response.status);
      this.logger.debug(`Health check result: ${isHealthy} (status: ${response.status})`);
      
      return isHealthy;
    } catch (error) {
      this.logger.debug(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 执行详细健康检查
   */
  async performDetailedHealthCheck(baseUrl: string): Promise<{
    isHealthy: boolean;
    version?: string;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const config = this.getHttpConfig();
      const response = await axios.get(`${baseUrl}/v1/models`, {
        ...config,
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = this.isSuccessResponse(response.status);
      
      return {
        isHealthy,
        version: 'vllm', // vLLM 通常不提供版本信息
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.debug(`Detailed health check failed: ${errorMessage}`);
      
      return {
        isHealthy: false,
        responseTime,
        error: errorMessage
      };
    }
  }

  /**
   * 检查服务是否可达
   */
  async checkConnectivity(baseUrl: string): Promise<boolean> {
    try {
      const config = {
        ...this.getHttpConfig(),
        timeout: 3000 // 更短的超时时间用于连接性检查
      };
      
      await axios.get(`${baseUrl}/v1/models`, config);
      return true;
    } catch (error) {
      this.logger.debug(`Connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 批量健康检查多个端点
   */
  async batchHealthCheck(baseUrls: string[]): Promise<Array<{
    url: string;
    isHealthy: boolean;
    responseTime: number;
    error?: string;
  }>> {
    const checks = baseUrls.map(async (url) => {
      const startTime = Date.now();
      try {
        const isHealthy = await this.performHealthCheck(url);
        return {
          url,
          isHealthy,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        return {
          url,
          isHealthy: false,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    return Promise.all(checks);
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 检查响应是否成功
   */
  private isSuccessResponse(status: number): boolean {
    return status >= 200 && status < 300;
  }

  /**
   * 获取HTTP配置
   */
  private getHttpConfig(): any {
    return {
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
}
