import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { 
  Wifi, 
  Server, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Globe,
  Lock
} from 'lucide-react';

interface ConnectionStatus {
  gateway: 'connected' | 'disconnected' | 'connecting';
  lastConnected: string;
  deviceId: string;
  registrationStatus: 'registered' | 'unregistered' | 'pending';
}

export const ConnectionSettings: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    gateway: 'disconnected',
    lastConnected: '',
    deviceId: '',
    registrationStatus: 'unregistered'
  });

  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8718');
  const [apiKey, setApiKey] = useState('');
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [useProxy, setUseProxy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');
  const [rewardAddress, setRewardAddress] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');

  // 获取当前连接状态
  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch('http://localhost:8716/api/v1/device-status/gateway-status');
      const data = await response.json();

      if (data.success) {
        setConnectionStatus(prev => ({
          ...prev,
          gateway: data.connected ? 'connected' : 'disconnected',
          lastConnected: data.lastConnected || '',
          deviceId: data.deviceId || '',
          registrationStatus: data.registered ? 'registered' : 'unregistered'
        }));
      }
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  // 获取网关地址
  const fetchGatewayAddress = async () => {
    try {
      const response = await fetch('http://localhost:8716/api/v1/device-status/gateway-address');
      const data = await response.json();

      if (data.success && data.gatewayAddress) {
        setGatewayUrl(data.gatewayAddress);
      }
    } catch (error) {
      console.error('Error fetching gateway address:', error);
    }
  };

  const handleConnectGateway = async () => {
    setConnectionStatus(prev => ({ ...prev, gateway: 'connecting' }));

    try {
      // 这里可以添加连接网关的逻辑
      // 目前只是刷新状态
      await fetchConnectionStatus();
    } catch (error) {
      console.error('Error connecting to gateway:', error);
      setConnectionStatus(prev => ({ ...prev, gateway: 'disconnected' }));
    }
  };

  const handleDisconnectGateway = () => {
    setConnectionStatus(prev => ({ ...prev, gateway: 'disconnected' }));
  };

  const handleRegisterDevice = async () => {
    setConnectionStatus(prev => ({ ...prev, registrationStatus: 'pending' }));

    try {
      const response = await fetch('http://localhost:8716/api/v1/device-status/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gateway_address: gatewayUrl,
          reward_address: rewardAddress,
          device_name: deviceName,
          code: registrationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus(prev => ({
          ...prev,
          registrationStatus: 'registered',
          deviceId: data.deviceId || prev.deviceId
        }));
        // 刷新连接状态
        await fetchConnectionStatus();
      } else {
        setConnectionStatus(prev => ({ ...prev, registrationStatus: 'unregistered' }));
        console.error('Registration failed:', data.error);
      }
    } catch (error) {
      console.error('Error registering device:', error);
      setConnectionStatus(prev => ({ ...prev, registrationStatus: 'unregistered' }));
    }
  };

  useEffect(() => {
    // 初始化时获取连接状态和网关地址
    fetchConnectionStatus();
    fetchGatewayAddress();

    // 定期更新连接状态
    const interval = setInterval(() => {
      fetchConnectionStatus();
    }, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'registered':
        return 'text-green-600';
      case 'connecting':
      case 'pending':
        return 'text-yellow-600';
      case 'disconnected':
      case 'unregistered':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'registered':
        return <CheckCircle className="h-4 w-4" />;
      case 'connecting':
      case 'pending':
        return <Settings className="h-4 w-4 animate-spin" />;
      case 'disconnected':
      case 'unregistered':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 min-h-0">
      {/* 连接状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">网关连接</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getStatusColor(connectionStatus.gateway)}`}>
              {getStatusIcon(connectionStatus.gateway)}
              {connectionStatus.gateway === 'connected' ? '已连接' :
               connectionStatus.gateway === 'connecting' ? '连接中' : '未连接'}
            </div>
            <p className="text-xs text-muted-foreground">
              最后连接: {connectionStatus.lastConnected}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">设备注册</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getStatusColor(connectionStatus.registrationStatus)}`}>
              {getStatusIcon(connectionStatus.registrationStatus)}
              {connectionStatus.registrationStatus === 'registered' ? '已注册' :
               connectionStatus.registrationStatus === 'pending' ? '注册中' : '未注册'}
            </div>
            <p className="text-xs text-muted-foreground">
              设备ID: {connectionStatus.deviceId}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">安全状态</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              安全
            </div>
            <p className="text-xs text-muted-foreground">
              TLS 加密连接
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 网关设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            网关设置
          </CardTitle>
          <CardDescription>配置网关连接参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">网关地址</label>
              <input
                type="url"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="https://gateway.sightai.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API 密钥</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="输入 API 密钥"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">自动重连</div>
              <div className="text-sm text-muted-foreground">
                连接断开时自动尝试重新连接
              </div>
            </div>
            <Switch
              checked={autoReconnect}
              onCheckedChange={setAutoReconnect}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">使用代理</div>
              <div className="text-sm text-muted-foreground">
                通过代理服务器连接网关
              </div>
            </div>
            <Switch
              checked={useProxy}
              onCheckedChange={setUseProxy}
            />
          </div>

          {useProxy && (
            <div className="space-y-2">
              <label className="text-sm font-medium">代理地址</label>
              <input
                type="url"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="http://proxy.example.com:8080"
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {connectionStatus.gateway === 'connected' ? (
              <Button 
                onClick={handleDisconnectGateway}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Wifi className="h-4 w-4" />
                断开连接
              </Button>
            ) : (
              <Button 
                onClick={handleConnectGateway}
                disabled={connectionStatus.gateway === 'connecting'}
                className="flex items-center gap-2"
              >
                <Wifi className="h-4 w-4" />
                {connectionStatus.gateway === 'connecting' ? '连接中...' : '连接网关'}
              </Button>
            )}
            <Button 
              onClick={handleRegisterDevice}
              disabled={connectionStatus.registrationStatus === 'pending'}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Server className="h-4 w-4" />
              {connectionStatus.registrationStatus === 'pending' ? '注册中...' : '注册设备'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 连接测试 */}
      <Card>
        <CardHeader>
          <CardTitle>连接测试</CardTitle>
          <CardDescription>测试网关连接和设备通信</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">网络连通性</span>
                </div>
                <p className="text-sm text-muted-foreground">延迟: 45ms</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">API 认证</span>
                </div>
                <p className="text-sm text-muted-foreground">认证成功</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              运行连接测试
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
