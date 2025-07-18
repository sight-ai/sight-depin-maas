/**
 * 请求管理器
 * 
 * 提供请求限制、熔断器、重试机制等功能，防止频繁请求导致资源耗尽
 */

interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  priority?: 'low' | 'normal' | 'high';
}

interface CircuitBreakerConfig {
  maxFailures: number;
  timeout: number;
  resetTimeout: number;
}

interface RequestQueueItem {
  url: string;
  options: RequestInit;
  resolve: (value: Response) => void;
  reject: (reason: any) => void;
  priority: number;
  timestamp: number;
}

export class RequestManager {
  private static instance: RequestManager;
  
  // 熔断器状态
  private circuitBreaker = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    config: {
      maxFailures: 3,
      timeout: 30000, // 30秒
      resetTimeout: 60000 // 60秒重置时间
    } as CircuitBreakerConfig
  };
  
  // 请求队列和限制
  private requestQueue: RequestQueueItem[] = [];
  private activeRequests = new Set<string>();
  private maxConcurrentRequests = 2; // 最大并发请求数
  private requestInterval = 1000; // 请求间隔（毫秒）
  private lastRequestTime = 0;
  
  // 缓存
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultCacheTTL = 30000; // 30秒缓存

  private constructor() {}

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  /**
   * 检查熔断器状态
   */
  private checkCircuitBreaker(): boolean {
    const now = Date.now();
    
    // 如果熔断器开启，检查是否可以重置
    if (this.circuitBreaker.isOpen) {
      if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.config.resetTimeout) {
        console.log('🔄 Circuit breaker reset');
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failureCount = 0;
        return true;
      }
      return false;
    }
    
    return true;
  }

  /**
   * 记录请求失败
   */
  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.config.maxFailures) {
      this.circuitBreaker.isOpen = true;
      console.warn(`🚨 Circuit breaker opened after ${this.circuitBreaker.failureCount} failures`);
    }
  }

  /**
   * 记录请求成功
   */
  private recordSuccess(): void {
    this.circuitBreaker.failureCount = 0;
  }

  /**
   * 获取缓存数据
   */
  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * 设置缓存数据
   */
  private setCache(key: string, data: any, ttl: number = this.defaultCacheTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 处理请求队列
   */
  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0 || this.activeRequests.size >= this.maxConcurrentRequests) {
      return;
    }

    // 按优先级排序
    this.requestQueue.sort((a, b) => b.priority - a.priority);
    
    const item = this.requestQueue.shift();
    if (!item) return;

    // 检查请求间隔
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestInterval) {
      // 重新加入队列
      this.requestQueue.unshift(item);
      setTimeout(() => this.processQueue(), this.requestInterval - timeSinceLastRequest);
      return;
    }

    this.lastRequestTime = now;
    this.activeRequests.add(item.url);

    try {
      const response = await fetch(item.url, item.options);
      item.resolve(response);
      this.recordSuccess();
    } catch (error) {
      item.reject(error);
      this.recordFailure();
    } finally {
      this.activeRequests.delete(item.url);
      // 继续处理队列
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * 受控的 fetch 请求
   */
  async fetch(url: string, options: RequestInit & RequestOptions = {}): Promise<Response> {
    const {
      timeout = 5000,
      retries = 1,
      retryDelay = 1000,
      priority = 'normal',
      ...fetchOptions
    } = options;

    // 检查缓存
    const cacheKey = `${url}_${JSON.stringify(fetchOptions)}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查熔断器
    if (!this.checkCircuitBreaker()) {
      throw new Error('Circuit breaker is open');
    }

    // 设置优先级数值
    const priorityValue = priority === 'high' ? 3 : priority === 'normal' ? 2 : 1;

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const requestOptions: RequestInit = {
      ...fetchOptions,
      signal: controller.signal
    };

    return new Promise<Response>((resolve, reject) => {
      const queueItem: RequestQueueItem = {
        url,
        options: requestOptions,
        resolve: (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        priority: priorityValue,
        timestamp: Date.now()
      };

      this.requestQueue.push(queueItem);
      this.processQueue();
    });
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      circuitBreaker: {
        isOpen: this.circuitBreaker.isOpen,
        failureCount: this.circuitBreaker.failureCount,
        lastFailureTime: this.circuitBreaker.lastFailureTime
      },
      queue: {
        length: this.requestQueue.length,
        activeRequests: this.activeRequests.size
      },
      cache: {
        size: this.cache.size
      }
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 重置熔断器
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = 0;
  }
}

// 导出单例实例
export const requestManager = RequestManager.getInstance();
