/**
 * 请求处理器契约接口
 */
export interface IRequestHandler {
  /**
   * 处理请求
   */
  handleRequest(context: any): Promise<any>;
}

/**
 * 健康检查器契约接口
 */
export interface IHealthChecker {
  /**
   * 检查健康状态
   */
  checkHealth(baseUrl: string): Promise<boolean>;
  
  /**
   * 检查详细健康状态
   */
  checkDetailedHealth(baseUrl: string): Promise<any>;
  
  /**
   * 检查连接性
   */
  checkConnectivity(baseUrl: string): Promise<boolean>;
  
  /**
   * 检查模型可用性
   */
  checkModelAvailability(baseUrl: string, modelName: string): Promise<boolean>;
}

/**
 * 信息服务契约接口
 */
export interface IInfoService {
  /**
   * 获取模型列表
   */
  getModelList(baseUrl: string): Promise<any>;
  
  /**
   * 获取模型信息
   */
  getModelInfo(baseUrl: string, modelName: string): Promise<any>;
  
  /**
   * 获取版本信息
   */
  getVersion(baseUrl: string): Promise<string>;
  
  /**
   * 获取统计信息
   */
  getStats(baseUrl: string): Promise<any>;
}
