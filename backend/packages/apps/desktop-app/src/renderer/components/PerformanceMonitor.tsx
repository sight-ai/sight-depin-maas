/**
 * 性能监控组件
 * 
 * 用于监控和显示应用性能指标，帮助识别性能问题
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Activity, Clock, Database, Zap } from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  apiResponseTime: number;
  componentUpdates: number;
  lastUpdate: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  updateInterval?: number;
  showDetails?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  updateInterval = 30000, // 🚨 修复：从5秒改为30秒，减少频繁调用
  showDetails = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    apiResponseTime: 0,
    componentUpdates: 0,
    lastUpdate: Date.now()
  });

  const [isVisible, setIsVisible] = useState(false);

  // 测量渲染性能
  const measureRenderTime = useCallback(() => {
    const start = performance.now();
    
    // 使用 requestAnimationFrame 来测量实际渲染时间
    requestAnimationFrame(() => {
      const end = performance.now();
      const renderTime = end - start;
      
      setMetrics(prev => ({
        ...prev,
        renderTime,
        componentUpdates: prev.componentUpdates + 1,
        lastUpdate: Date.now()
      }));
    });
  }, []);

  // 获取内存使用情况
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / 1024 / 1024, // MB
        total: memory.totalJSHeapSize / 1024 / 1024, // MB
        limit: memory.jsHeapSizeLimit / 1024 / 1024 // MB
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }, []);

  // 🚨 修复：优化 API 响应时间测量，减少频繁调用
  const measureApiResponseTime = useCallback(async () => {
    if (!window.electronAPI) return 0;

    // 添加缓存，避免频繁调用
    const cacheKey = 'api_response_time_cache';
    const cached = sessionStorage.getItem(cacheKey);
    const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);

    // 如果缓存存在且未过期（60秒内），使用缓存数据
    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 60000) {
      return parseFloat(cached);
    }

    const start = performance.now();
    try {
      await window.electronAPI.getSystemInfo();
      const end = performance.now();
      const responseTime = end - start;

      // 缓存结果
      sessionStorage.setItem(cacheKey, responseTime.toString());
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      return responseTime;
    } catch (error) {
      return 0;
    }
  }, []);

  // 获取缓存命中率（模拟）
  const getCacheHitRate = useCallback(() => {
    // 这里可以从实际的缓存服务获取数据
    // 目前返回模拟数据
    return Math.random() * 100;
  }, []);

  // 更新性能指标
  const updateMetrics = useCallback(async () => {
    const memory = getMemoryUsage();
    const apiTime = await measureApiResponseTime();
    const cacheRate = getCacheHitRate();

    setMetrics(prev => ({
      ...prev,
      memoryUsage: memory.used,
      apiResponseTime: apiTime,
      cacheHitRate: cacheRate,
      lastUpdate: Date.now()
    }));
  }, [getMemoryUsage, measureApiResponseTime, getCacheHitRate]);

  // 定期更新指标
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(updateMetrics, updateInterval);
    return () => clearInterval(interval);
  }, [enabled, updateInterval, updateMetrics]);

  // 监听渲染性能
  useEffect(() => {
    if (!enabled) return;
    measureRenderTime();
  });

  // 键盘快捷键切换显示
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!enabled || !isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer opacity-50 hover:opacity-100"
        onClick={() => setIsVisible(true)}
        title="点击显示性能监控 (Ctrl+Shift+P)"
      >
        <Activity size={24} className="text-blue-500" />
      </div>
    );
  }

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-black/90 text-white border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity size={16} />
              性能监控
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* 渲染时间 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                渲染时间
              </span>
              <span className={getPerformanceColor(metrics.renderTime, { good: 16, warning: 32 })}>
                {metrics.renderTime.toFixed(2)}ms
              </span>
            </div>

            {/* 内存使用 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Database size={12} />
                内存使用
              </span>
              <span className={getPerformanceColor(metrics.memoryUsage, { good: 50, warning: 100 })}>
                {metrics.memoryUsage.toFixed(1)}MB
              </span>
            </div>

            {/* API 响应时间 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Zap size={12} />
                API 响应
              </span>
              <span className={getPerformanceColor(metrics.apiResponseTime, { good: 100, warning: 500 })}>
                {metrics.apiResponseTime.toFixed(0)}ms
              </span>
            </div>

            {/* 缓存命中率 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Activity size={12} />
                缓存命中率
              </span>
              <span className={getPerformanceColor(100 - metrics.cacheHitRate, { good: 20, warning: 50 })}>
                {metrics.cacheHitRate.toFixed(1)}%
              </span>
            </div>

            {/* 组件更新次数 */}
            <div className="flex items-center justify-between">
              <span>组件更新</span>
              <span className="text-blue-400">
                {metrics.componentUpdates}
              </span>
            </div>

            {showDetails && (
              <>
                <hr className="border-gray-600 my-2" />
                <div className="text-xs text-gray-400">
                  <div>最后更新: {new Date(metrics.lastUpdate).toLocaleTimeString()}</div>
                  <div>更新间隔: {updateInterval / 1000}s</div>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 text-xs text-gray-400">
            按 Ctrl+Shift+P 切换显示
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// 性能监控 Hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0
  });

  const trackRender = useCallback(() => {
    const now = performance.now();
    setMetrics(prev => ({
      renderCount: prev.renderCount + 1,
      lastRenderTime: now
    }));
  }, []);

  useEffect(() => {
    trackRender();
  });

  return { metrics, trackRender };
};
