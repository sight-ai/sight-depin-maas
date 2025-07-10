import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import {
  Cpu,
  HardDrive,
  Monitor,
  Server,
  Zap
} from 'lucide-react';

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface CyberDashboardProps {
  backendStatus: BackendStatus;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  temperature: number;
  network: number;
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
  uptime: string;
  connections: number;
}



interface EarningsData {
  today: number;
  total: number;
  tasks: number;
  efficiency: number;
}

export const CyberDashboard: React.FC<CyberDashboardProps> = ({ backendStatus }) => {
  // 性能优化：使用 useRef 避免不必要的重渲染
  const intervalRefs = useRef<{
    system?: NodeJS.Timeout;
    status?: NodeJS.Timeout;
    earnings?: NodeJS.Timeout;
  }>({});

  // 性能优化：缓存数据和减少状态更新频率
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 🚨 紧急修复：添加请求控制和熔断机制
  const requestControlRef = useRef({
    isRequestInProgress: false,
    failureCount: 0,
    lastFailureTime: 0,
    circuitBreakerOpen: false,
    maxFailures: 3,
    circuitBreakerTimeout: 30000 // 30秒熔断时间
  });

  // 🚨 紧急修复：使用简单的初始化标志，避免复杂的函数引用
  const isInitializedRef = useRef(false);

  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    gpu: 0,
    temperature: 0,
    network: 0
  });


  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    total: 0,
    tasks: 0,
    efficiency: 0
  });

  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Backend API', status: 'offline', uptime: '0m', connections: 0 },
    { name: 'Model Framework', status: 'offline', uptime: '0m', connections: 0 },
    { name: 'Gateway Connection', status: 'offline', uptime: '0m', connections: 0 },
    // { name: 'LibP2P Service', status: 'offline', uptime: '0m', connections: 0 }
  ]);

  // 🚨 紧急修复：熔断器检查函数
  const checkCircuitBreaker = useCallback(() => {
    const control = requestControlRef.current;
    const now = Date.now();

    // 如果熔断器开启，检查是否可以重置
    if (control.circuitBreakerOpen) {
      if (now - control.lastFailureTime > control.circuitBreakerTimeout) {
        console.log('🔄 Circuit breaker reset - attempting to reconnect');
        control.circuitBreakerOpen = false;
        control.failureCount = 0;
        return true;
      }
      return false;
    }

    return true;
  }, []);

  // 🚨 紧急修复：记录请求失败
  const recordFailure = useCallback(() => {
    const control = requestControlRef.current;
    control.failureCount++;
    control.lastFailureTime = Date.now();

    if (control.failureCount >= control.maxFailures) {
      control.circuitBreakerOpen = true;
      console.warn(`🚨 Circuit breaker opened after ${control.failureCount} failures`);
    }
  }, []);

  // 🚨 紧急修复：记录请求成功
  const recordSuccess = useCallback(() => {
    const control = requestControlRef.current;
    control.failureCount = 0;
    control.circuitBreakerOpen = false;
  }, []);

  // 🚨 紧急修复：添加请求控制的系统资源获取
  const fetchSystemResources = useCallback(async () => {
    // 检查基本条件和熔断器状态
    if (!backendStatus.isRunning || isLoading || requestControlRef.current.isRequestInProgress) {
      return;
    }

    if (!checkCircuitBreaker()) {
      console.log('⚡ Circuit breaker is open, skipping system resources request');
      return;
    }

    requestControlRef.current.isRequestInProgress = true;

    try {
      // 优先使用 Electron API（本地调用，更可靠）
      if (window.electronAPI && window.electronAPI.getSystemInfo) {
        const result = await window.electronAPI.getSystemInfo();
        if (result.success && result.data) {
          const systemInfo = result.data;
          setMetrics({
            cpu: systemInfo.cpu?.usage || 0,
            memory: systemInfo.memory?.usage || 0,
            gpu: systemInfo.gpu?.usage || 0,
            temperature: (systemInfo.gpu as any)?.temperature || (systemInfo.cpu as any)?.temperature || 0,
            network: Math.min(
              (systemInfo.network?.interfaces?.reduce((total: number, iface: any) =>
                total + (iface.isActive ? 10 : 0), 0) || 0), 100
            )
          });
          setLastUpdateTime(Date.now());
          recordSuccess();
          return;
        }
      }

      // 回退到 HTTP 请求（添加超时控制）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      try {
        const response = await fetch(`http://localhost:${backendStatus.port}/api/app/system-resources`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMetrics({
              cpu: data.data.cpu?.usage || data.data.cpuUsage || 0,
              memory: data.data.memory?.usage || data.data.memoryUsage || 0,
              gpu: data.data.gpus?.[0]?.usage || 0,
              temperature: data.data.gpus?.[0]?.temperature || 0,
              network: Math.min(((data.data.network?.rx || 0) + (data.data.network?.tx || 0)) / 1024 / 1024, 100)
            });
            setLastUpdateTime(Date.now());
            recordSuccess();
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Failed to fetch system resources:', error);
      recordFailure();

      // 只在首次失败时设置默认值，避免频繁更新
      if (lastUpdateTime === 0) {
        setMetrics({
          cpu: 0,
          memory: 0,
          gpu: 0,
          temperature: 0,
          network: 0
        });
      }
    } finally {
      requestControlRef.current.isRequestInProgress = false;
    }
  }, [backendStatus.isRunning, backendStatus.port]); // 🚨 进一步简化依赖项，移除可能变化的依赖

  // 🚨 紧急修复：添加请求控制的应用状态获取
  const fetchAppStatus = useCallback(async () => {
    // 检查基本条件和熔断器状态
    if (!backendStatus.isRunning || isLoading || requestControlRef.current.isRequestInProgress) {
      return;
    }

    if (!checkCircuitBreaker()) {
      console.log('⚡ Circuit breaker is open, skipping app status request');
      return;
    }

    try {
      // 优先使用 Electron API（本地调用，更可靠）
      if (window.electronAPI && window.electronAPI.getAppInfo) {
        const appInfoResult = await window.electronAPI.getAppInfo();
        if (appInfoResult) {
          const uptime = Math.floor(appInfoResult.uptime / 1000 / 60); // 转换为分钟
          const uptimeStr = uptime > 60 ? `${Math.floor(uptime / 60)}h+` : `${uptime}m`;

          // 更新服务状态
          setServices(prev => prev.map(service => {
            switch (service.name) {
              case 'Backend API':
                return {
                  ...service,
                  status: 'online',
                  uptime: uptimeStr,
                  connections: 1
                };
              default:
                return service;
            }
          }));
          recordSuccess();
          return; // 使用 Electron API 成功后直接返回，避免 HTTP 请求
        }
      }

      // 回退到 HTTP 请求（添加超时控制）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      try {
        const response = await fetch(`http://localhost:${backendStatus.port}/api/app/status`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setServices(prev => prev.map(service => {
              switch (service.name) {
                case 'Backend API':
                  return { ...service, status: 'online', uptime: '24h+', connections: 1 };
                case 'Model Framework':
                  return {
                    ...service,
                    status: data.data.framework?.available ? 'online' : 'offline',
                    uptime: data.data.framework?.available ? '12h+' : '0m',
                    connections: data.data.framework?.models?.length || 0
                  };
                case 'Gateway Connection':
                  return {
                    ...service,
                    status: data.data.device?.healthy ? 'online' : 'warning',
                    uptime: data.data.device?.healthy ? '6h+' : '0m',
                    connections: data.data.device?.healthy ? 1 : 0
                  };
                default:
                  return service;
              }
            }));
            recordSuccess();
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Failed to fetch app status:', error);
      recordFailure();

      // 设置离线状态
      setServices(prev => prev.map(service => ({
        ...service,
        status: 'offline' as const,
        uptime: '0m',
        connections: 0
      })));
    }
  }, [backendStatus.isRunning, backendStatus.port]); // 🚨 简化依赖项

  // Fetch earnings data using new dashboard API
  // 🚨 紧急修复：添加请求控制的收益数据获取
  const fetchEarnings = useCallback(async () => {
    // 检查基本条件和熔断器状态
    if (!backendStatus.isRunning || isLoading || requestControlRef.current.isRequestInProgress) {
      return;
    }

    if (!checkCircuitBreaker()) {
      console.log('⚡ Circuit breaker is open, skipping earnings request');
      return;
    }

    try {
      // 优化：添加缓存机制，避免频繁请求
      const now = Date.now();
      const cacheKey = 'earnings_cache';
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);

      // 如果缓存存在且未过期（60秒内），使用缓存数据
      if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 60000) {
        const cached = JSON.parse(cachedData);
        setEarnings(cached);
        recordSuccess();
        return;
      }

      // HTTP 请求（添加超时控制）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时（收益数据不那么紧急）

      try {
        const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/dashboard/statistics`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const stats = data.data;
            const newEarnings = {
              today: stats.todayEarnings?.totalEarnings || 0,
              total: stats.cumulativeEarnings?.totalEarnings || 0,
              tasks: stats.totalTasks || 0,
              efficiency: stats.up_time_percentage || 0
            };

            // 更新状态和缓存
            setEarnings(newEarnings);
            sessionStorage.setItem(cacheKey, JSON.stringify(newEarnings));
            sessionStorage.setItem(`${cacheKey}_time`, now.toString());
            recordSuccess();
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      recordFailure();

      // 只在首次失败时设置默认值
      if (earnings.today === 0 && earnings.total === 0) {
        setEarnings({
          today: 0,
          total: 0,
          tasks: 0,
          efficiency: 0
        });
      }
    }
  }, [backendStatus.isRunning, backendStatus.port]); // 🚨 简化依赖项，移除状态依赖

  // 🚨 紧急修复：修复无限循环问题 - 简化依赖项
  useEffect(() => {
    if (!backendStatus.isRunning) {
      // 清理所有定时器
      Object.values(intervalRefs.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      intervalRefs.current = {};
      isInitializedRef.current = false;
      return;
    }

    // 防止重复初始化
    if (isInitializedRef.current) {
      console.log('⚠️ Already initialized, skipping');
      return;
    }

    isInitializedRef.current = true;
    setIsLoading(true);

    // 🚨 紧急修复：串行执行初始数据获取，避免并发请求过多
    const initialLoad = async () => {
      try {
        // 串行执行，避免同时发起多个请求
        console.log('🔄 Starting initial data load...');

        // 首先获取系统资源（最重要的数据）
        await fetchSystemResources();

        // 等待一小段时间再获取应用状态
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchAppStatus();

        // 最后获取收益数据（优先级最低）
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchEarnings();

        console.log('✅ Initial data load completed');
      } catch (error) {
        console.error('❌ Initial data load failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialLoad();

    // 🚨 紧急修复：大幅减少更新频率，避免资源耗尽
    // 系统资源：改为10秒（从5秒进一步减少）
    intervalRefs.current.system = setInterval(() => {
      fetchSystemResources();
    }, 10000);

    // 应用状态：改为30秒（从15秒进一步减少）
    intervalRefs.current.status = setInterval(() => {
      fetchAppStatus();
    }, 30000);

    // 收益数据：改为120秒（从60秒进一步减少）
    intervalRefs.current.earnings = setInterval(() => {
      fetchEarnings();
    }, 120000);

    return () => {
      // 清理所有定时器
      Object.values(intervalRefs.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      intervalRefs.current = {};
      setIsLoading(false);
    };
  }, [backendStatus.isRunning]); // 🚨 只保留最基本的依赖，避免无限循环





  // 性能优化：使用 useMemo 缓存计算结果
  const systemStatusInfo = useMemo(() => ({
    status: backendStatus.isRunning ? 'ONLINE' : 'OFFLINE',
    statusColor: backendStatus.isRunning ? 'text-green-500' : 'text-red-500',
    port: backendStatus.port || 8761,
    textShadow: backendStatus.isRunning ?
      '0px 0px 10.3px rgba(130, 255, 153, 1)' :
      '0px 0px 10.3px rgba(255, 130, 130, 1)'
  }), [backendStatus.isRunning, backendStatus.port]);

  // 性能优化：使用 useMemo 缓存格式化的运行时间
  const formattedUptime = useMemo(() => {
    const now = Date.now();
    const uptime = Math.floor((now - (lastUpdateTime || now)) / 1000 / 60);
    return uptime > 60 ? `${Math.floor(uptime / 60)}h ${uptime % 60}m` : `${uptime}m`;
  }, [lastUpdateTime]);

  // 性能优化：添加加载状态指示
  const LoadingIndicator = useMemo(() => (
    isLoading ? (
      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
    ) : null
  ), [isLoading]);

  // 🚨 紧急修复：添加熔断器状态指示
  const CircuitBreakerIndicator = useMemo(() => {
    const control = requestControlRef.current;
    if (control.circuitBreakerOpen) {
      return (
        <div className="absolute top-2 left-2 flex items-center gap-1 text-xs text-red-500">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>连接中断</span>
        </div>
      );
    }
    if (control.failureCount > 0) {
      return (
        <div className="absolute top-2 left-2 flex items-center gap-1 text-xs text-yellow-500">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span>连接不稳定</span>
        </div>
      );
    }
    return null;
  }, [requestControlRef.current.circuitBreakerOpen, requestControlRef.current.failureCount]);

  return (
    <div className='bg-white space-y-6'>
        {/* Basic Information Section */}
        <Card className="bg-white rounded-2xl border-0 relative" style={{ boxShadow: '0px 0px 44px 0px rgba(232, 232, 232, 1)' }}>
          {LoadingIndicator}
          {CircuitBreakerIndicator}
          <CardContent className="p-8 space-y-9">
            <h2 className="text-2xl font-medium text-black">Basic Information</h2>

            <div className="flex gap-11">
              {/* SIGHTAI_SYSTEM_STATUS */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={systemStatusInfo.status}
                    readOnly
                    className={`w-full px-6 py-4 text-base ${systemStatusInfo.statusColor} bg-white border-2 border-gray-400 focus:outline-none font-normal`}
                    style={{
                      textShadow: systemStatusInfo.textShadow,
                      borderRadius: '18px'
                    }}
                  />
                  <label className="absolute -top-2 left-4 px-2 text-xs text-gray-600 bg-white">
                    SIGHTAI_SYSTEM_STATUS
                  </label>
                  <div className={`mt-2 px-6 text-xs ${systemStatusInfo.statusColor}`} style={{ textShadow: systemStatusInfo.textShadow }}>
                    [PORT: {systemStatusInfo.port}]
                  </div>
                </div>
              </div>

              {/* Version */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value="v0.9.3 Beta"
                    readOnly
                    className="w-full px-6 py-4 text-base text-gray-900 bg-white border-2 border-gray-400 focus:outline-none font-normal"
                    style={{ borderRadius: '18px' }}
                  />
                  <label className="absolute -top-2 left-4 px-2 text-xs text-gray-600 bg-white">
                    Version
                  </label>
                </div>
              </div>

              {/* Uptime */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value="3d 4h 10min"
                    readOnly
                    className="w-full px-6 py-4 text-base text-gray-900 bg-white border-2 border-gray-400 focus:outline-none font-normal"
                    style={{ borderRadius: '18px' }}
                  />
                  <label className="absolute -top-2 left-4 px-2 text-xs text-gray-600 bg-white">
                    Uptime
                  </label>
                </div>
              </div>
            </div>

            {/* Task and Earnings Stats */}
            <div className="flex gap-32">
              <div className=" h-26">
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Aldrich, monospace' }}>
                    {earnings.tasks}
                  </div>
                  <div className="text-lg text-gray-900">Task Completed</div>
                </div>
              </div>

              <div className=" h-26">
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Aldrich, monospace' }}>
                    $ {earnings.today.toFixed(2)}
                  </div>
                  <div className="text-lg text-gray-900">Today Earnings</div>
                </div>
              </div>

              <div className=" h-26">
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Aldrich, monospace' }}>
                    $ {earnings.total.toFixed(2)}
                  </div>
                  <div className="text-lg text-gray-900">Total Earnings</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Resource Performance */}
        <div className="space-y-4">
          <h2 className="text-2xl font-medium text-black">System Resource Performance</h2>

          <div className="flex gap-4">
            {/* CPU */}
            <Card className="flex-1 bg-white rounded-xl border-0 p-4" style={{ boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)' }}>
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-7 w-7 text-gray-800" strokeWidth={2} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-base text-gray-800">CPU</span>
                      <span className="text-base font-medium text-gray-800">{metrics.cpu.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-sm h-3">
                      <div
                        className="bg-black h-3 rounded-sm transition-all duration-300"
                        style={{ width: `${Math.min(metrics.cpu * 0.45, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {/* <div className="text-base text-black text-center">Neural Processing Unit</div> */}
              </CardContent>
            </Card>

            {/* Memory */}
            <Card className="flex-1 bg-white rounded-xl border-0 p-4" style={{ boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)' }}>
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-6 w-6 text-gray-800" strokeWidth={2} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-base text-gray-800">Memory</span>
                      <span className="text-base font-medium text-gray-800">{metrics.memory.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-sm h-3">
                      <div
                        className="h-3 rounded-sm transition-all duration-300"
                        style={{
                          width: `${Math.min(metrics.memory * 0.45, 100)}%`,
                          backgroundColor: '#6D20F5'
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* <div className="text-base text-black text-center">Data Storage Buffer</div> */}
              </CardContent>
            </Card>

            {/* GPU */}
            <Card className="flex-1 bg-white rounded-xl border-0 p-4" style={{ boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)' }}>
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-6 w-6 text-gray-800" strokeWidth={2} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-base text-gray-800">GPU</span>
                      <span className="text-base font-medium text-gray-800">{metrics.gpu.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-sm h-3">
                      <div
                        className="h-3 rounded-sm transition-all duration-300"
                        style={{
                          width: `${Math.min(metrics.gpu * 0.45, 100)}%`,
                          backgroundColor: '#E7337A'
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* <div className="text-base text-black text-center">Graphics Accelerator</div> */}
              </CardContent>
            </Card>

            {/* Temperature */}
            <Card className="flex-1 bg-white rounded-xl border-0 p-4" style={{ boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)' }}>
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-gray-800" strokeWidth={2} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-base text-gray-800">Temp</span>
                      <span className="text-base font-medium text-gray-800">{metrics.temperature.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-sm h-3">
                      <div
                        className="h-3 rounded-sm transition-all duration-300"
                        style={{
                          width: `${Math.min(metrics.temperature * 0.45, 100)}%`,
                          backgroundColor: '#F7D046'
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* <div className="text-base text-black text-center">Thermal Status</div> */}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Service Status */}
        <div className="flex">
          <Card
            className="bg-white rounded-xl border-0"
            style={{
              boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)',
              width: '412px'
            }}
          >
            <CardContent className="px-3 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Server className="h-7 w-7 text-gray-800" strokeWidth={2} />
                <h2 className="text-2xl font-medium text-gray-800">Service Status</h2>
              </div>

              <div className="space-y-3">
                {services.map((service, index) => (
                  <Card
                    key={index}
                    className="bg-white rounded-lg border-0"
                    style={{
                      boxShadow: '0px 0px 40px 0px rgba(213, 213, 213, 0.57)',
                      width: '368px'
                    }}
                  >
                    <CardContent className="px-1.5 py-2">
                      <div className="flex items-center justify-center gap-8">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: service.status === 'online'
                                ? 'radial-gradient(circle, #1AFF00 0%, #54FF41 61.5%, rgba(255, 255, 255, 0.24) 100%)'
                                : service.status === 'warning'
                                  ? 'radial-gradient(circle, #F7D046 56%, rgba(255, 255, 255, 0) 100%)'
                                  : 'radial-gradient(circle, #FF0000 0%, #FF4141 61.5%, rgba(255, 255, 255, 0.24) 100%)'
                            }}
                          />
                          <div style={{ width: '201px' }}>
                            <div className="text-sm text-black font-normal" style={{ fontFamily: 'Roboto', fontSize: '14px', lineHeight: '1.43em', letterSpacing: '1.79%' }}>
                              {service.name}
                            </div>
                            <div className="text-sm text-black font-normal" style={{ fontFamily: 'Roboto', fontSize: '14px', lineHeight: '1.43em', letterSpacing: '1.79%' }}>
                              Uptime: {service.uptime} ｜Connections: {service.connections}
                            </div>
                          </div>
                        </div>
                        <button
                          className="px-2 py-2 text-base rounded-full"
                          style={{
                            backgroundColor: '#191717',
                            color: '#F5F5F5',
                            borderRadius: '9999px',
                            width: '87px',
                            fontFamily: 'Inter',
                            fontSize: '16px',
                            fontWeight: '400',
                            lineHeight: '1em'
                          }}
                        >
                          {service.status === 'online' ? 'Online' : service.status === 'warning' ? 'Warning' : 'Offline'}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};
