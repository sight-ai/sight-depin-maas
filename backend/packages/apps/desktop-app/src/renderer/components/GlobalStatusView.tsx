import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import {
  Activity,
  DollarSign,
  Wifi,
  Server,
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Monitor,
  Play,
  Square,
  RotateCcw
} from 'lucide-react';

/**
 * 收益信息接口
 */
interface EarningsInfo {
  earning_info: {
    total_block_rewards: number;
    total_job_rewards: number;
  };
  device_info: {
    name: string;
    status: string;
  };
  statistics: {
    up_time_percentage: number;
    earning_serials: number[];
    request_serials: number[];
    task_activity: any[];
  };
}

/**
 * Gateway 状态接口
 */
interface GatewayStatus {
  isRegistered: boolean;
}

/**
 * 应用状态接口
 */
interface AppStatus {
  success: boolean;
  data: {
    isReady: boolean;
    framework: {
      type: string;
      available: boolean;
      version: string;
      models: string[];
    };
    device: {
      status: string;
      healthy: boolean;
    };
    configuration: {
      valid: boolean;
      errors: string[];
    };
    lastUpdated: string;
  };
  timestamp: string;
}

/**
 * 应用配置接口
 */
interface AppConfig {
  success: boolean;
  data: {
    clientType: string | null;
    frameworkConfig: any;
    lastUpdated: string;
    environment: string;
    logLevel: string;
    enableMetrics: boolean;
    enableTelemetry: boolean;
  };
  timestamp: string;
}

/**
 * 系统资源接口
 */
interface SystemResources {
  success: boolean;
  data: {
    gpus: Array<{ id: number; name: string; memory: string; utilization?: number }>;
    totalMemory: string;
    availableMemory: string;
    cpuCores: number;
    cpuUsage: number;
    memoryUsage: number;
    timestamp: string;
  };
  timestamp: string;
}

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface GlobalStatusViewProps {
  backendStatus: BackendStatus;
}

export const GlobalStatusView: React.FC<GlobalStatusViewProps> = ({
  backendStatus
}) => {
  const [earningsData, setEarningsData] = useState<EarningsInfo | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(new Date());
  const [serviceOperationLoading, setServiceOperationLoading] = useState(false);

  // 获取分布式状态信息
  const fetchStatusData = async () => {
    try {
      if (!backendStatus.isRunning) {
        setError('Backend service is not running');
        return;
      }

      const baseUrl = `http://localhost:${backendStatus.port}`;

      // 并行获取各个接口的数据
      const [earningsRes, gatewayRes, appStatusRes, appConfigRes, systemResourcesRes] = await Promise.allSettled([
        fetch(`${baseUrl}/api/v1/miner/summary`),
        fetch(`${baseUrl}/api/v1/device-status/gateway-status`),
        fetch(`${baseUrl}/api/app/status`),
        fetch(`${baseUrl}/api/app/config`),
        fetch(`${baseUrl}/api/app/system-resources`)
      ]);

      // 处理收益数据
      if (earningsRes.status === 'fulfilled' && earningsRes.value.ok) {
        const earnings = await earningsRes.value.json();
        setEarningsData(earnings);
      }

      // 处理 Gateway 状态
      if (gatewayRes.status === 'fulfilled' && gatewayRes.value.ok) {
        const gateway = await gatewayRes.value.json();
        setGatewayStatus(gateway);
      }

      // 处理应用状态
      if (appStatusRes.status === 'fulfilled' && appStatusRes.value.ok) {
        const status = await appStatusRes.value.json();
        setAppStatus(status);
      }

      // 处理应用配置
      if (appConfigRes.status === 'fulfilled' && appConfigRes.value.ok) {
        const config = await appConfigRes.value.json();
        setAppConfig(config);
      }

      // 处理系统资源
      if (systemResourcesRes.status === 'fulfilled' && systemResourcesRes.value.ok) {
        const resources = await systemResourcesRes.value.json();
        setSystemResources(resources);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching status data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初始加载
    fetchStatusData();

    // 定期更新（每10秒）
    const interval = setInterval(fetchStatusData, 10000);

    return () => clearInterval(interval);
  }, [backendStatus.isRunning, backendStatus.port]);

  // 格式化运行时间
  const formatUptime = (startTime: Date): string => {
    const uptime = Date.now() - startTime.getTime();
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  };

  // 服务管理功能
  const handleServiceOperation = async (operation: 'start' | 'stop' | 'restart') => {
    setServiceOperationLoading(true);
    try {
      let result;
      switch (operation) {
        case 'start':
          result = await window.electronAPI.startBackend();
          break;
        case 'stop':
          result = await window.electronAPI.stopBackend();
          break;
        case 'restart':
          result = await window.electronAPI.restartBackend();
          break;
      }

      if (result.success) {
        // 操作成功后刷新状态
        setTimeout(() => {
          fetchStatusData();
        }, 2000);
      } else {
        setError(`Failed to ${operation} backend service: ${result.error}`);
      }
    } catch (error) {
      setError(`Error during ${operation} operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setServiceOperationLoading(false);
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'running':
      case 'connected':
        return 'text-green-600';
      case 'warning':
      case 'disconnected':
        return 'text-yellow-600';
      case 'offline':
      case 'error':
      case 'stopped':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'running':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
      case 'disconnected':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'offline':
      case 'error':
      case 'stopped':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading system status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load system status: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 检查是否有任何数据可用
  const hasAnyData = earningsData || gatewayStatus || appStatus || appConfig;
  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No system status data available
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Overview
            </CardTitle>
            <CardDescription>
              Current system status and runtime information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {appStatus?.data?.device ? getStatusIcon(appStatus.data.device.status) : <Activity className="h-4 w-4 text-gray-600" />}
                <div>
                  <div className={`text-lg font-semibold ${appStatus?.data?.device ? getStatusColor(appStatus.data.device.status) : 'text-gray-600'}`}>
                    {appStatus?.data?.device?.status?.toUpperCase() || 'UNKNOWN'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Device Status: {appStatus?.data?.device?.healthy ? 'Healthy' : 'Unhealthy'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Runtime</div>
                <div className="font-medium">{formatUptime(startTime)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Device Information</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Device Name</span>
                <span className="text-sm font-medium">
                  {earningsData?.device_info?.name || 'Unknown Device'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Environment</span>
                <span className="text-sm font-medium">
                  {appConfig?.data?.environment || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Started</span>
                <span className="text-sm font-medium">
                  {startTime.toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* System Resources */}
      {systemResources && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              System Resources
            </CardTitle>
            <CardDescription>Real-time system resource usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span className="text-sm">CPU Usage</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {(systemResources.data.cpuUsage * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {systemResources.data.cpuCores} cores
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="text-sm">Memory Usage</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {systemResources.data.memoryUsage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {systemResources.data.totalMemory} total
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm">GPU Status</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {systemResources.data.gpus.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {systemResources.data.gpus.length > 0 ? 'Available' : 'None detected'}
                  </div>
                </div>
              </div>
            </div>

            {systemResources.data.gpus.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium mb-2">GPU Details</div>
                <div className="space-y-2">
                  {systemResources.data.gpus.map((gpu, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{gpu.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{gpu.memory}</span>
                        {gpu.utilization !== undefined && (
                          <span className="font-medium">{gpu.utilization}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Service Status
            </CardTitle>
            <CardDescription>Backend services and connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Gateway</span>
              </div>
              <div className="flex items-center gap-2">
                {gatewayStatus?.isRegistered ? getStatusIcon('connected') : getStatusIcon('disconnected')}
                <Badge variant={gatewayStatus?.isRegistered ? 'default' : 'secondary'}>
                  {gatewayStatus?.isRegistered ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span className="text-sm">Backend</span>
              </div>
              <div className="flex items-center gap-2">
                {backendStatus.isRunning ? getStatusIcon('running') : getStatusIcon('stopped')}
                <Badge variant={backendStatus.isRunning ? 'default' : 'destructive'}>
                  {backendStatus.isRunning ? 'Running' : 'Stopped'}
                </Badge>
              </div>
            </div>

            {/* Service Management Buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Service Control</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleServiceOperation('start')}
                  disabled={backendStatus.isRunning || serviceOperationLoading}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleServiceOperation('stop')}
                  disabled={!backendStatus.isRunning || serviceOperationLoading}
                >
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleServiceOperation('restart')}
                  disabled={serviceOperationLoading}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restart
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm">Configuration</span>
              </div>
              <div className="flex items-center gap-2">
                {appStatus?.data?.configuration?.valid ? getStatusIcon('connected') : getStatusIcon('error')}
                <Badge variant={appStatus?.data?.configuration?.valid ? 'default' : 'destructive'}>
                  {appStatus?.data?.configuration?.valid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Inference Engine
            </CardTitle>
            <CardDescription>AI model inference environment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Framework</span>
              <Badge variant={appStatus?.data?.framework?.available ? 'default' : 'secondary'}>
                {appStatus?.data?.framework?.type || 'None'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <div className="flex items-center gap-2">
                {appStatus?.data?.framework?.available ? getStatusIcon('running') : getStatusIcon('stopped')}
                <Badge variant={appStatus?.data?.framework?.available ? 'default' : 'secondary'}>
                  {appStatus?.data?.framework?.available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Models</span>
              <span className="text-sm font-medium">
                {appStatus?.data?.framework?.models?.length || 0} available
              </span>
            </div>

            {appStatus?.data?.framework?.version && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Version</span>
                <span className="text-sm font-medium">
                  {appStatus.data.framework.version}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Earnings Overview */}
      {earningsData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Earnings Overview
            </CardTitle>
            <CardDescription>Mining earnings statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {earningsData.earning_info.total_block_rewards}
                </div>
                <div className="text-sm text-muted-foreground">Block Rewards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {earningsData.earning_info.total_job_rewards}
                </div>
                <div className="text-sm text-muted-foreground">Job Rewards</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Uptime Percentage</span>
                <span className="text-sm font-medium">
                  {earningsData.statistics.up_time_percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};
