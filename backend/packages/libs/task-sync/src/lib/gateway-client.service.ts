import { Injectable, Logger } from "@nestjs/common";
import { TGatewayClient, TaskType, EarningType, SyncRequestParams, GatewayResponse, GATEWAY_CLIENT_SERVICE } from "./task-sync.interface";
import got from "got-cjs";

/**
 * Gateway Client Service
 * 专门负责与网关的HTTP通信
 */
@Injectable()
export class GatewayClientService implements TGatewayClient {
  private readonly logger = new Logger(GatewayClientService.name);

  /**
   * 从网关获取任务列表
   */
  async fetchTasks(params: SyncRequestParams): Promise<TaskType[]> {
    try {
      const response = await got.get(`${params.gatewayAddress}/node/devices/${params.deviceId}/tasks`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${params.authKey}`
        },
        searchParams: {
          page: params.page || 1,
          pageSize: params.pageSize || 100
        }
      }).json() as GatewayResponse<TaskType>;

      return this.extractDataFromResponse(response, 'tasks');
    } catch (error) {
      this.logger.error('Failed to fetch tasks from gateway:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Gateway tasks fetch failed: ${errorMsg}`);
    }
  }

  /**
   * 从网关获取收益记录列表
   */
  async fetchEarnings(params: SyncRequestParams): Promise<EarningType[]> {
    try {
      const response = await got.get(`${params.gatewayAddress}/node/devices/${params.deviceId}/earnings`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${params.authKey}`
        },
        searchParams: {
          page: params.page || 1,
          pageSize: params.pageSize || 100
        }
      }).json() as GatewayResponse<EarningType>;

      return this.extractDataFromResponse(response, 'earnings');
    } catch (error) {
      this.logger.error('Failed to fetch earnings from gateway:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Gateway earnings fetch failed: ${errorMsg}`);
    }
  }

  /**
   * 从网关响应中提取数据
   * 处理不同的响应格式
   */
  private extractDataFromResponse<T>(response: any, dataType: string): T[] {
    if (!response) {
      this.logger.warn(`Empty response for ${dataType}`);
      return [];
    }

    // 处理新的分页响应格式
    if (response.success && response.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    // 兼容旧格式
    const items = Array.isArray(response) ? response :
                  (response.data && Array.isArray(response.data)) ? response.data : [];

    if (!Array.isArray(items)) {
      this.logger.warn(
        `Unexpected response format for ${dataType}. Expected array, got:`,
        typeof items
      );
      return [];
    }

    return items;
  }
}

const GatewayClientServiceProvider = {
  provide: GATEWAY_CLIENT_SERVICE,
  useClass: GatewayClientService
};

export default GatewayClientServiceProvider;
