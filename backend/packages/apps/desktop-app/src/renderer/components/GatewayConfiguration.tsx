/**
 * Gateway Configuration 页面组件
 * 
 * 根据 Figma 设计实现的网关配置页面
 * 包含连接状态和网关设置功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Copy, Check, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatus {
  currentGateway: string;
  latency: string;
  registrationCode: string;
  environment: string;
}

interface GatewaySettings {
  autoSelectBestGateway: boolean;
  dnsOverride: boolean;
}

interface GatewayConfigurationProps {
  backendStatus?: {
    isRunning: boolean;
    port: number;
  };
}

export const GatewayConfiguration: React.FC<GatewayConfigurationProps> = ({ backendStatus }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    currentGateway: 'gateway.sightai.com',
    latency: '23ms',
    registrationCode: 'ABC123DEF456',
    environment: 'Production'
  });

  const [gatewaySettings, setGatewaySettings] = useState<GatewaySettings>({
    autoSelectBestGateway: true,
    dnsOverride: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // 获取连接状态
  const fetchConnectionStatus = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    setError(null);
    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/gateway/status`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setConnectionStatus(result.data);
          setIsConnected(true);
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
      setError('Failed to load connection status. Please check your connection.');
      setIsConnected(false);
    }
  }, [backendStatus]);

  // 获取网关设置
  const fetchGatewaySettings = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/gateway/settings`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGatewaySettings(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch gateway settings:', error);
    }
  }, [backendStatus]);

  // 更新网关设置
  const updateGatewaySetting = useCallback(async (key: keyof GatewaySettings, value: boolean) => {
    if (!backendStatus?.isRunning) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/gateway/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: value
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGatewaySettings(prev => ({
            ...prev,
            [key]: value
          }));
        } else {
          throw new Error(result.error || 'Failed to update setting');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update gateway setting:', error);
      setError('Failed to update setting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus]);

  // 复制注册码
  const copyRegistrationCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(connectionStatus.registrationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy registration code:', error);
    }
  }, [connectionStatus.registrationCode]);

  useEffect(() => {
    fetchConnectionStatus();
    fetchGatewaySettings();
    
    // 定期刷新连接状态（每30秒）
    const interval = setInterval(fetchConnectionStatus, 30000);
    
    return () => clearInterval(interval);
  }, [fetchConnectionStatus, fetchGatewaySettings]);

  return (
    <div className="min-h-screen bg-white">
              <Card className="bg-white rounded-2xl p-6 shadow-lg">
      
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Connection Status Section */}
        <Card className="bg-white rounded-2xl border-0" style={{ boxShadow: '0px 0px 40px 0px rgba(236, 236, 236, 1)' }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-medium text-black tracking-tight" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
                Connection Status
              </h1>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Wifi size={20} className="text-green-500" />
                ) : (
                  <WifiOff size={20} className="text-red-500" />
                )}
                <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* First Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-base font-medium text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Current Gateway
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <div className="text-sm text-black" style={{ fontFamily: 'Menlo, monospace' }}>
                      {connectionStatus.currentGateway}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-base font-medium text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Latency
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <div className="text-sm text-black" style={{ fontFamily: 'Menlo, monospace' }}>
                      {connectionStatus.latency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-base font-medium text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Registration Code
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-center justify-between">
                    <div className="text-sm text-black" style={{ fontFamily: 'Menlo, monospace' }}>
                      {connectionStatus.registrationCode}
                    </div>
                    <Button
                      onClick={copyRegistrationCode}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-200 rounded-lg"
                    >
                      {copiedCode ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} className="text-gray-600" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-base font-medium text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Environment
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <div className="text-sm text-black" style={{ fontFamily: 'Menlo, monospace' }}>
                      {connectionStatus.environment}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gateway Settings Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium text-black tracking-tight" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
            Gateway Settings
          </h2>
          
          <div className="space-y-3">
            {/* Auto Select Best Gateway */}
            <div className=" rounded-xl p-4 flex items-center justify-between ">
              <div className="space-y-1 flex-1">
                <div className="text-lg font-normal text-gray-900 tracking-wide" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Auto Select Best Gateway
                </div>
                <div className="text-sm font-normal text-gray-500 tracking-wide leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Automatically select optimal gateway based on latency
                </div>
              </div>
              <Switch
                checked={gatewaySettings.autoSelectBestGateway}
                onCheckedChange={(checked) => updateGatewaySetting('autoSelectBestGateway', checked)}
                disabled={isLoading}
                className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>

            {/* DNS Override */}
            <div className=" rounded-xl p-4 flex items-center justify-between  ">
              <div className="space-y-1 flex-1">
                <div className="text-lg font-normal text-gray-900 tracking-wide" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  DNS Override
                </div>
                <div className="text-sm font-normal text-gray-500 tracking-wide leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Use DNS service provided by gateway
                </div>
              </div>
              <Switch
                checked={gatewaySettings.dnsOverride}
                onCheckedChange={(checked) => updateGatewaySetting('dnsOverride', checked)}
                disabled={isLoading}
                className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
        </div>
      </div>
      </Card>
    </div>
  );
};
