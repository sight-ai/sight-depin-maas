/**
 * Dashboard 页面组件
 *
 * 重构后的Dashboard，使用组件化架构和可靠的数据获取
 * 显示系统概览信息，包括：
 * - 系统状态和基本信息
 * - 收益统计
 * - 系统资源监控
 * - 服务状态
 */

import React, { useState } from 'react';
import { useDashboardData, copyToClipboard } from '../hooks/useDashboardData';
import { SystemInfo } from './dashboard/SystemInfo';
import { EarningsStats } from './dashboard/EarningsStats';
import { SystemResources } from './dashboard/SystemResources';
import { ServiceStatus } from './dashboard/ServiceStatus';
import { Button } from './ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { BackendStatus } from '../hooks/types';

export const Dashboard: React.FC<{backendStatus: BackendStatus}> = ({backendStatus}) => {
  const { data, error, refresh } = useDashboardData(backendStatus);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // 复制到剪贴板处理
  const handleCopyToClipboard = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess('Copied to clipboard!');
      setTimeout(() => setCopySuccess(null), 2000);
    } else {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // 错误状态显示
  if (error && !data) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Failed to Load Dashboard
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={refresh} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和刷新按钮 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">System overview and performance metrics</p>
          </div>
          <div className="flex items-center gap-4">
            {copySuccess && (
              <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                {copySuccess}
              </span>
            )}
            <Button
              onClick={refresh}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* 错误提示（如果有错误但仍有数据显示） */}
        {error && data && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800">
                Warning: Some data may be outdated. {error}
              </span>
            </div>
          </div>
        )}

        {/* 系统信息 */}
        <SystemInfo
          systemStatus={data.systemInfo.status}
          systemPort={data.systemInfo.port}
          version={data.systemInfo.version}
          uptime={data.systemInfo.uptime}
          deviceInfo={data.deviceInfo}
          onCopyToClipboard={handleCopyToClipboard}
        />

        {/* 收益统计 */}
        <EarningsStats
          taskCompleted={data.earnings.taskCompleted}
          todayEarnings={data.earnings.todayEarnings}
          totalEarnings={data.earnings.totalEarnings}
        />

        {/* 系统资源监控 */}
        <SystemResources
          cpuUsage={data.systemResources.cpuUsage}
          memoryUsage={data.systemResources.memoryUsage}
          gpuUsage={data.systemResources.gpuUsage}
          temperatureUsage={data.systemResources.temperatureUsage}
        />

        {/* 服务状态 */}
        <ServiceStatus
          services={data.services}
        />

        {/* 页面底部信息 */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>
            Last updated: {new Date().toLocaleTimeString()} |
            Backend: {backendStatus?.isRunning ? 'Connected' : 'Disconnected'} |
            Auto-refresh: Every 10 seconds
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;