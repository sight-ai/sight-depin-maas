/**
 * API请求管理器
 * 
 * 功能：
 * - 防止同一API的并发请求
 * - 请求缓存和去重
 * - 防抖机制
 * - 请求状态管理
 */

interface RequestCache {
  promise: Promise<any>;
  timestamp: number;
  data?: any;
}

interface RequestConfig {
  cacheTime?: number; // 缓存时间（毫秒）
  debounceTime?: number; // 防抖时间（毫秒）
  maxRetries?: number; // 最大重试次数
}

class ApiRequestManager {
  private static instance: ApiRequestManager;
  private requestCache = new Map<string, RequestCache>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private pendingRequests = new Set<string>();

  private constructor() {}

  static getInstance(): ApiRequestManager {
    if (!ApiRequestManager.instance) {
      ApiRequestManager.instance = new ApiRequestManager();
    }
    return ApiRequestManager.instance;
  }

  /**
   * 生成请求的唯一键
   */
  private generateRequestKey(url: string, method: string = 'GET', body?: any): string {
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyStr}`;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cache: RequestCache, cacheTime: number): boolean {
    return Date.now() - cache.timestamp < cacheTime;
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cache] of this.requestCache.entries()) {
      // 清理超过10分钟的缓存
      if (now - cache.timestamp > 10 * 60 * 1000) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * 执行API请求（带缓存和去重）
   */
  async request<T>(
    url: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      cacheTime = 30000, // 默认30秒缓存
      debounceTime = 1000, // 默认1秒防抖
      maxRetries = 3
    } = config;

    const method = options.method || 'GET';
    const requestKey = this.generateRequestKey(url, method, options.body);

    // 清理过期缓存
    this.cleanExpiredCache();

    // 检查缓存
    const cached = this.requestCache.get(requestKey);
    if (cached && this.isCacheValid(cached, cacheTime)) {
      console.log(`[API Cache] Using cached data for: ${requestKey}`);
      return cached.data;
    }

    // 检查是否有相同的请求正在进行
    if (this.pendingRequests.has(requestKey)) {
      console.log(`[API Dedup] Request already pending: ${requestKey}`);
      // 等待正在进行的请求
      if (cached?.promise) {
        return await cached.promise;
      }
    }

    // 防抖处理
    if (method === 'GET' && debounceTime > 0) {
      return new Promise<T>((resolve, reject) => {
        // 清除之前的防抖定时器
        const existingTimer = this.debounceTimers.get(requestKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // 设置新的防抖定时器
        const timer = setTimeout(async () => {
          this.debounceTimers.delete(requestKey);
          try {
            const result = await this.executeRequest<T>(url, options, requestKey, maxRetries);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, debounceTime);

        this.debounceTimers.set(requestKey, timer);
      });
    }

    // 直接执行请求
    return this.executeRequest<T>(url, options, requestKey, maxRetries);
  }

  /**
   * 执行实际的API请求
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    requestKey: string,
    maxRetries: number
  ): Promise<T> {
    // 标记请求开始
    this.pendingRequests.add(requestKey);

    const requestPromise = this.performRequest<T>(url, options, maxRetries);

    // 缓存请求Promise
    this.requestCache.set(requestKey, {
      promise: requestPromise,
      timestamp: Date.now()
    });

    try {
      const result = await requestPromise;
      
      // 更新缓存数据
      this.requestCache.set(requestKey, {
        promise: requestPromise,
        timestamp: Date.now(),
        data: result
      });

      console.log(`[API Success] ${requestKey}`);
      return result;
    } catch (error) {
      // 请求失败时清除缓存
      this.requestCache.delete(requestKey);
      console.error(`[API Error] ${requestKey}:`, error);
      throw error;
    } finally {
      // 清除pending标记
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * 执行HTTP请求（带重试）
   */
  private async performRequest<T>(
    url: string,
    options: RequestInit,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          // 指数退避重试
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`[API Retry] Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * 清除特定请求的缓存
   */
  clearCache(url: string, method: string = 'GET', body?: any): void {
    const requestKey = this.generateRequestKey(url, method, body);
    this.requestCache.delete(requestKey);
    
    // 清除防抖定时器
    const timer = this.debounceTimers.get(requestKey);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(requestKey);
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.requestCache.clear();
    
    // 清除所有防抖定时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * 获取当前缓存状态
   */
  getCacheStats(): { totalCached: number; pendingRequests: number } {
    return {
      totalCached: this.requestCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// 导出单例实例
export const apiRequestManager = ApiRequestManager.getInstance();

// 便捷方法
export const cachedFetch = <T>(
  url: string,
  options?: RequestInit,
  config?: RequestConfig
): Promise<T> => {
  return apiRequestManager.request<T>(url, options, config);
};

export default apiRequestManager;
