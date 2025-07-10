/**
 * 设备状态组件
 * 
 * 使用新的设备管理 API 显示设备状态和信息
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { createApiClient, handleApiError } from '../utils/api-client';

interface DeviceStatusData {
  deviceId: string;
  status: string;
  registrationStatus: string;
  gatewayConnection: boolean;
  lastUpdate: string;
}

interface GatewayStatusData {
  connected: boolean;
  gatewayUrl: string;
  lastPing: string;
  latency: number;
}

interface DidInfoData {
  did: string;
  publicKey: string;
  created: string;
  lastUpdated: string;
}

interface DeviceStatusProps {
  backendStatus?: {
    isRunning: boolean;
    port: number;
  };
}

export const DeviceStatus: React.FC<DeviceStatusProps> = ({ backendStatus }) => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusData | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusData | null>(null);
  const [didInfo, setDidInfo] = useState<DidInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取设备状态
  const fetchDeviceStatus = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    try {
      const apiClient = createApiClient(backendStatus);
      const response = await apiClient.getDeviceStatus();
      
      if (response.success && response.data) {
        setDeviceStatus(response.data as any);
      }
    } catch (error) {
      console.error('Failed to fetch device status:', error);
      setError(handleApiError(error));
    }
  }, [backendStatus]);

  // 获取网关状态
  const fetchGatewayStatus = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    try {
      const apiClient = createApiClient(backendStatus);
      const response = await apiClient.getGatewayStatus();
      
      if (response.success && response.data) {
        setGatewayStatus(response.data as any);
      }
    } catch (error) {
      console.error('Failed to fetch gateway status:', error);
    }
  }, [backendStatus]);

  // 获取 DID 信息
  const fetchDidInfo = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    try {
      const apiClient = createApiClient(backendStatus);
      const response = await apiClient.getDidInfo();
      
      if (response.success && response.data) {
        setDidInfo(response.data as any);
      }
    } catch (error) {
      console.error('Failed to fetch DID info:', error);
    }
  }, [backendStatus]);

  // 更新 DID
  const handleUpdateDid = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    setIsLoading(true);
    try {
      const apiClient = createApiClient(backendStatus);
      const response = await apiClient.updateDid();
      
      if (response.success) {
        // 重新获取 DID 信息
        await fetchDidInfo();
        setError(null);
      } else {
        setError(response.error || 'Failed to update DID');
      }
    } catch (error) {
      console.error('Failed to update DID:', error);
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus, fetchDidInfo]);

  // 刷新所有数据
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchDeviceStatus(),
        fetchGatewayStatus(),
        fetchDidInfo()
      ]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [fetchDeviceStatus, fetchGatewayStatus, fetchDidInfo]);

  // 初始化数据
  useEffect(() => {
    if (backendStatus?.isRunning) {
      handleRefresh();
    }
  }, [backendStatus?.isRunning, handleRefresh]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      case 'offline':
        return <Badge className="bg-red-100 text-red-800">Offline</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Card className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Device Status</h1>
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Device Status Card */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                Device Information
              </h2>
              
              {deviceStatus ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Device ID</label>
                    <p className="text-sm text-gray-900 font-mono">{deviceStatus.deviceId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(deviceStatus.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registration Status</label>
                    <p className="text-sm text-gray-900">{deviceStatus.registrationStatus}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Update</label>
                    <p className="text-sm text-gray-900">
                      {deviceStatus.lastUpdate ? new Date(deviceStatus.lastUpdate).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading device information...</p>
              )}
            </CardContent>
          </Card>

          {/* Gateway Status Card */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {gatewayStatus?.connected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                Gateway Connection
              </h2>
              
              {gatewayStatus ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Connection Status</label>
                    <div className="mt-1">
                      {gatewayStatus.connected ? (
                        <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Disconnected</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gateway URL</label>
                    <p className="text-sm text-gray-900 font-mono">{gatewayStatus.gatewayUrl}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Latency</label>
                    <p className="text-sm text-gray-900">{gatewayStatus.latency}ms</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Ping</label>
                    <p className="text-sm text-gray-900">
                      {gatewayStatus.lastPing ? new Date(gatewayStatus.lastPing).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading gateway status...</p>
              )}
            </CardContent>
          </Card>

          {/* DID Information Card */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                  DID Information
                </h2>
                <Button 
                  onClick={handleUpdateDid} 
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  Update DID
                </Button>
              </div>
              
              {didInfo ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">DID</label>
                    <p className="text-sm text-gray-900 font-mono break-all">{didInfo.did}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Public Key</label>
                    <p className="text-sm text-gray-900 font-mono break-all">{didInfo.publicKey}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-sm text-gray-900">
                        {didInfo.created ? new Date(didInfo.created).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="text-sm text-gray-900">
                        {didInfo.lastUpdated ? new Date(didInfo.lastUpdated).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading DID information...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </Card>
    </div>
  );
};
