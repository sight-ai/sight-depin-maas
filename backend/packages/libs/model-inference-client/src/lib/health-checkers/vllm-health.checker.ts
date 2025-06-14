import { Injectable, Logger } from '@nestjs/common';
import { DetailedHealthCheckResult, IHealthChecker } from '@saito/models';

/**
 * vLLM 健康检查器
 * 
 */
@Injectable()
export class VllmHealthChecker implements IHealthChecker {
  private readonly logger = new Logger(VllmHealthChecker.name);

  /**
   * 执行基础健康检查
   */
  async performHealthCheck(baseUrl: string): Promise<boolean> {
    try {
      this.logger.debug(`Performing health check for vLLM at: ${baseUrl}`);
      
      // vLLM 通常提供 /health 端点
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const isHealthy = response.ok;
      this.logger.debug(`vLLM health check result: ${isHealthy}`);
      
      return isHealthy;
    } catch (error) {
      this.logger.warn(`vLLM health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      this.logger.debug(`Performing detailed health check for vLLM at: ${baseUrl}`);
      
      // 首先检查健康端点
      const healthResponse = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const responseTime = Date.now() - startTime;

      if (!healthResponse.ok) {
        return {
          isHealthy: false,
          responseTime,
          error: `HTTP ${healthResponse.status}: ${healthResponse.statusText}`
        };
      }

      // 尝试获取版本信息
      let version = 'unknown';
      try {
        const versionResponse = await fetch(`${baseUrl}/version`, {
          method: 'GET',
          headers: this.getAuthHeaders()
        });
        
        if (versionResponse.ok) {
          const versionData = await versionResponse.json() as any;
          version = versionData.version || 'unknown';
        }
      } catch (versionError) {
        this.logger.debug(`Could not fetch vLLM version: ${versionError instanceof Error ? versionError.message : 'Unknown error'}`);
      }

      this.logger.debug(`vLLM detailed health check successful - Version: ${version}, Response time: ${responseTime}ms`);

      return {
        isHealthy: true,
        version,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.warn(`vLLM detailed health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 检查 vLLM 服务连接性
   */
  async checkConnectivity(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      return response.ok;
    } catch (error) {
      this.logger.debug(`vLLM connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 检查特定模型是否可用
   */
  async checkModelAvailability(baseUrl: string, modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as any;
      const models = data.data || [];
      
      return models.some((model: any) => model.id === modelName);
    } catch (error) {
      this.logger.debug(`vLLM model availability check failed for ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 获取认证头
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    return headers;
  }

  /**
   * 获取 API Key
   */
  private getApiKey(): string | undefined {
    return process.env['VLLM_API_KEY'];
  }

  /**
   * 实现 IHealthChecker 接口 - 检查健康状态
   */
  async checkHealth(baseUrl: string): Promise<boolean> {
    return this.performHealthCheck(baseUrl);
  }

  /**
   * 实现 IHealthChecker 接口 - 检查详细健康状态
   */
  async checkDetailedHealth(baseUrl: string): Promise<DetailedHealthCheckResult> {
    const result = await this.performDetailedHealthCheck(baseUrl);
    return {
      isHealthy: result.isHealthy,
      responseTime: result.responseTime,
      version: result.version,
      error: result.error
    };
  }
}
