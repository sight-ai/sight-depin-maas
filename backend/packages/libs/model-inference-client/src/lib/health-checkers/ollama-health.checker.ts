import { Injectable, Logger } from '@nestjs/common';
import { DetailedHealthCheckResult, IHealthChecker } from '@saito/models';

/**
 * Ollama 健康检查器
 * 
 */
@Injectable()
export class OllamaHealthChecker implements IHealthChecker {
  private readonly logger = new Logger(OllamaHealthChecker.name);

  /**
   * 执行基础健康检查
   */
  async performHealthCheck(baseUrl: string): Promise<boolean> {
    try {
      this.logger.debug(`Performing health check for Ollama at: ${baseUrl}`);
      
      const response = await fetch(`${baseUrl}/api/version`, {
        method: 'GET'
      });

      const isHealthy = response.ok;
      this.logger.debug(`Ollama health check result: ${isHealthy}`);
      
      return isHealthy;
    } catch (error) {
      this.logger.warn(`Ollama health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      this.logger.debug(`Performing detailed health check for Ollama at: ${baseUrl}`);
      
      const response = await fetch(`${baseUrl}/api/version`, {
        method: 'GET'
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          isHealthy: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const versionData = await response.json() as any;
      const version = versionData.version || 'unknown';

      this.logger.debug(`Ollama detailed health check successful - Version: ${version}, Response time: ${responseTime}ms`);

      return {
        isHealthy: true,
        version,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.warn(`Ollama detailed health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 检查 Ollama 服务连接性
   */
  async checkConnectivity(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET'
      });

      return response.ok;
    } catch (error) {
      this.logger.debug(`Ollama connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 检查特定模型是否可用
   */
  async checkModelAvailability(baseUrl: string, modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: modelName })
      });

      return response.ok;
    } catch (error) {
      this.logger.debug(`Ollama model availability check failed for ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
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
