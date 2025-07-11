/**
 * 基础数据服务抽象类
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责基础数据服务的抽象定义
 * - 依赖倒置原则：依赖于抽象接口而非具体实现
 * - 开闭原则：对扩展开放，对修改封闭
 */

import { IDataService, ApiResponse, BackendStatus } from '../../hooks/types';
import { createApiClient } from '../../utils/api-client';

/**
 * 基础数据服务抽象类
 * 
 * 提供所有数据服务的基础功能：
 * - API客户端管理
 * - 基础CRUD操作接口
 * - 错误处理机制
 */
export abstract class BaseDataService<T> implements IDataService<T> {
  protected apiClient: ReturnType<typeof createApiClient> | null = null;

  constructor(protected backendStatus: BackendStatus | null) {
    if (backendStatus?.isRunning) {
      this.apiClient = createApiClient(backendStatus);
    }
  }

  /**
   * 获取数据 - 子类必须实现
   */
  abstract fetch(): Promise<ApiResponse<T>>;

  /**
   * 更新数据 - 可选实现
   */
  async update?(data: Partial<T>): Promise<ApiResponse<T>> {
    throw new Error('Update operation not implemented');
  }

  /**
   * 删除数据 - 可选实现
   */
  async delete?(id: string): Promise<ApiResponse<void>> {
    throw new Error('Delete operation not implemented');
  }

  /**
   * 格式化运行时间
   */
  protected formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  }

  /**
   * 格式化地址显示
   */
  protected formatAddress(address: string): string {
    if (!address || address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * 安全获取嵌套属性
   */
  protected safeGet(obj: any, path: string, defaultValue: any = null): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  }

  /**
   * 检查API响应是否成功
   */
  protected isSuccessResponse(response: any): boolean {
    return response && response.status === 'fulfilled' && response.value && response.value.success;
  }

  /**
   * 获取API响应数据
   */
  protected getResponseData(response: any): any {
    if (this.isSuccessResponse(response)) {
      return response.value.data || response.value;
    }
    return null;
  }

  /**
   * 创建错误响应
   */
  protected createErrorResponse(error: string): ApiResponse<T> {
    return {
      success: false,
      error: error
    };
  }

  /**
   * 创建成功响应
   */
  protected createSuccessResponse(data: T): ApiResponse<T> {
    return {
      success: true,
      data: data
    };
  }
}
