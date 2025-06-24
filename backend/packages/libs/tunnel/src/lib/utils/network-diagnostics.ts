import { Logger } from '@nestjs/common';
import got from 'got-cjs';

/**
 * 网络诊断工具
 * 用于诊断tunnel连接问题
 */
export class NetworkDiagnostics {
  private readonly logger = new Logger(NetworkDiagnostics.name);

  /**
   * 诊断网关连接
   */
  async diagnoseGatewayConnection(gatewayAddress: string): Promise<void> {
    this.logger.log('🔍 开始网关连接诊断...');
    this.logger.log(`网关地址: ${gatewayAddress}`);

    // 1. 检查基础HTTP连接
    await this.checkHttpConnection(gatewayAddress);

    // 2. 检查Socket.IO端点
    await this.checkSocketIOEndpoint(gatewayAddress);

    // 3. 检查网络延迟
    await this.checkNetworkLatency(gatewayAddress);

    this.logger.log('✅ 网关连接诊断完成');
  }

  /**
   * 检查HTTP连接
   */
  private async checkHttpConnection(gatewayAddress: string): Promise<void> {
    try {
      this.logger.debug('检查HTTP连接...');
      const response = await got.get(gatewayAddress, {
        timeout: { request: 5000 },
        throwHttpErrors: false
      });

      if (response.statusCode === 200) {
        this.logger.log(`✅ HTTP连接正常 (状态码: ${response.statusCode})`);
      } else {
        this.logger.warn(`⚠️ HTTP连接异常 (状态码: ${response.statusCode})`);
      }
    } catch (error) {
      this.logger.error(`❌ HTTP连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查Socket.IO端点
   */
  private async checkSocketIOEndpoint(gatewayAddress: string): Promise<void> {
    try {
      this.logger.debug('检查Socket.IO端点...');
      const socketIOUrl = `${gatewayAddress}/socket.io/`;
      const response = await got.get(socketIOUrl, {
        timeout: { request: 5000 },
        throwHttpErrors: false
      });

      if (response.statusCode === 200) {
        this.logger.log(`✅ Socket.IO端点可访问 (状态码: ${response.statusCode})`);
      } else if (response.statusCode === 400) {
        this.logger.log(`✅ Socket.IO端点正常 (状态码: 400 - 这是正常的Socket.IO响应)`);
      } else {
        this.logger.warn(`⚠️ Socket.IO端点异常 (状态码: ${response.statusCode})`);
      }
    } catch (error) {
      this.logger.error(`❌ Socket.IO端点检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查网络延迟
   */
  private async checkNetworkLatency(gatewayAddress: string): Promise<void> {
    try {
      this.logger.debug('检查网络延迟...');
      const startTime = Date.now();
      
      await got.get(gatewayAddress, {
        timeout: { request: 10000 },
        throwHttpErrors: false
      });
      
      const latency = Date.now() - startTime;
      
      if (latency < 100) {
        this.logger.log(`✅ 网络延迟良好: ${latency}ms`);
      } else if (latency < 500) {
        this.logger.warn(`⚠️ 网络延迟较高: ${latency}ms`);
      } else {
        this.logger.error(`❌ 网络延迟过高: ${latency}ms`);
      }
    } catch (error) {
      this.logger.error(`❌ 网络延迟检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 分析Socket.IO错误
   */
  analyzeSocketIOError(error: string): void {
    this.logger.log('🔍 分析Socket.IO错误...');

    if (error.includes('xhr poll error')) {
      this.logger.warn('📊 错误类型: XHR Polling Error');
      this.logger.warn('可能原因:');
      this.logger.warn('  1. 网关服务器重启或过载');
      this.logger.warn('  2. 网络连接不稳定');
      this.logger.warn('  3. 防火墙阻止了HTTP长轮询');
      this.logger.warn('  4. 代理服务器配置问题');
      this.logger.warn('建议解决方案:');
      this.logger.warn('  1. 检查网关服务器状态');
      this.logger.warn('  2. 检查网络连接稳定性');
      this.logger.warn('  3. 配置防火墙允许Socket.IO流量');
      this.logger.warn('  4. 检查代理设置');
    } else if (error.includes('websocket error')) {
      this.logger.warn('📊 错误类型: WebSocket Error');
      this.logger.warn('可能原因:');
      this.logger.warn('  1. WebSocket协议被阻止');
      this.logger.warn('  2. 网关不支持WebSocket');
      this.logger.warn('  3. 网络中间件问题');
    } else if (error.includes('timeout')) {
      this.logger.warn('📊 错误类型: Connection Timeout');
      this.logger.warn('可能原因:');
      this.logger.warn('  1. 网络延迟过高');
      this.logger.warn('  2. 网关响应缓慢');
      this.logger.warn('  3. 连接超时设置过短');
    } else {
      this.logger.warn(`📊 未知错误类型: ${error}`);
    }
  }

  /**
   * 提供连接建议
   */
  provideConnectionAdvice(): void {
    this.logger.log('💡 连接优化建议:');
    this.logger.log('  1. 确保网关服务器正常运行');
    this.logger.log('  2. 检查网络连接稳定性');
    this.logger.log('  3. 配置适当的超时设置');
    this.logger.log('  4. 考虑使用连接池');
    this.logger.log('  5. 监控网络质量指标');
  }
}
