import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { TunnelService } from './tunnel.interface';
import * as R from 'ramda';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private readonly tunnelService: TunnelService,
  ) {}

  /**
   * 获取目标节点
   * 这个方法应该根据您的业务逻辑实现
   * 例如，可以从数据库中获取空闲节点
   */
  private async getTargetNode(): Promise<{ node_id: string; id: string } | null> {
    try {
      // 获取所有已连接设备
      const connectedDevices = await this.tunnelService.getConnectedDevices();
      
      // 如果没有已连接设备，返回null
      if (!connectedDevices || connectedDevices.length === 0) {
        return null;
      }
      
      // 简单实现：返回第一个已连接设备
      // 在实际应用中，您可能需要实现更复杂的负载均衡逻辑
      return {
        node_id: connectedDevices[0],
        id: connectedDevices[0]
      };
    } catch (error) {
      this.logger.error(`获取目标节点错误: ${error instanceof Error ? error.message : '未知错误'}`);
      return null;
    }
  }

  /**
   * 代理请求到Ollama
   * @param req Express请求对象
   * @returns 代理响应
   */
  async proxyRequest(req: Request): Promise<any> {
    try {
      this.logger.debug('proxyRequest: getTargetNode');
      const idleNode = await this.getTargetNode();
      this.logger.debug('proxyRequest: getTargetNode', idleNode);
      
      // 确保idleNode不为空
      if (!idleNode) {
        throw new HttpException('找不到可用节点', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const taskId = `proxy-${idleNode.node_id}`;

      // 从请求头中提取用户ID (如果存在)
      let userId = R.path(['user', 'userId'], req);
      if (!userId) {
        // 这里应该根据您的业务逻辑实现
        // 例如，从数据库中获取用户ID
        userId = 'anonymous';
      }
      
      this.logger.debug('idleNode proxyRequest userId:', userId);
      this.logger.debug('userID proxyRequest:', userId);
      
      return new Promise((resolve, reject) => {
        // 注册响应处理器
        this.tunnelService.handleRegisterStreamHandler({
          taskId,
          targetDeviceId: idleNode.node_id,
          onMessage: async (response: any) => {
            if (response.error) {
              reject(response.error);
            } else {
              resolve(response);
            }
            return Promise.resolve();
          }
        });
        
        // 发送代理请求
        this.tunnelService.handleSendToDevice({
          deviceId: idleNode.node_id,
          message: JSON.stringify({
            type: 'proxy_request',
            taskId,
            data: {
              method: req.method,
              url: req.originalUrl,
              headers: req.headers,
              body: req.body,
              userId // 添加用户ID
            }
          })
        });
      });

    } catch (error) {
      console.error('Proxy request error:', error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Proxy request failed',
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export const ProxyServiceProvider = {
  provide: ProxyService,
  useClass: ProxyService,
};
