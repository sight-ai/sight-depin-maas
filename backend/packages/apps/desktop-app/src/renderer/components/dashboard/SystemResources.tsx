/**
 * 系统资源监控组件
 * 显示CPU、内存、GPU、温度等系统资源使用情况
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Cpu, HardDrive, Monitor, Zap } from 'lucide-react';

interface SystemResourcesProps {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  temperatureUsage: number;
}

export const SystemResources: React.FC<SystemResourcesProps> = ({
  cpuUsage,
  memoryUsage,
  gpuUsage,
  temperatureUsage
}) => {
  // 进度条组件
  const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <div className="w-full bg-gray-200 rounded-sm h-3 relative">
      <div className="absolute inset-0 bg-gray-200 rounded-sm" />
      <div
        className="h-3 rounded-sm transition-all duration-300 relative"
        style={{
          width: `${Math.min(Math.max(value, 0), 100)}%`,
          background: color
        }}
      />
    </div>
  );

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <CardContent className="p-0 space-y-6">
        <h2 className="text-xl font-medium text-black">System Resource Performance</h2>

        {/* 系统指标网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU */}
          <Card className="bg-white rounded-xl border p-4 shadow-sm">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-6 w-6 text-gray-800" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base text-gray-800">CPU</span>
                    <span className="text-base font-medium text-gray-800">
                      {cpuUsage.toFixed(0)}%
                    </span>
                  </div>
                  <ProgressBar value={cpuUsage} color="#000000" />
                </div>
              </div>
              <div className="text-center text-sm text-gray-600">
                Neural Processing Unit
              </div>
            </CardContent>
          </Card>

          {/* Memory */}
          <Card className="bg-white rounded-xl border p-4 shadow-sm">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center gap-2">
                <HardDrive className="h-6 w-6 text-gray-800" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base text-gray-800">Memory</span>
                    <span className="text-base font-medium text-gray-800">
                      {memoryUsage.toFixed(0)}%
                    </span>
                  </div>
                  <ProgressBar value={memoryUsage} color="#6D20F5" />
                </div>
              </div>
              <div className="text-center text-sm text-gray-600">
                Data Storage Buffer
              </div>
            </CardContent>
          </Card>

          {/* GPU */}
          <Card className="bg-white rounded-xl border p-4 shadow-sm">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-6 w-6 text-gray-800" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base text-gray-800">GPU</span>
                    <span className="text-base font-medium text-gray-800">
                      {gpuUsage.toFixed(0)}%
                    </span>
                  </div>
                  <ProgressBar value={gpuUsage} color="#E7337A" />
                </div>
              </div>
              <div className="text-center text-sm text-gray-600">
                Graphics Rendering Unit
              </div>
            </CardContent>
          </Card>

          {/* Temperature */}
          <Card className="bg-white rounded-xl border p-4 shadow-sm">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-gray-800" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base text-gray-800">Temp</span>
                    <span className="text-base font-medium text-gray-800">
                      {temperatureUsage.toFixed(0)}°C
                    </span>
                  </div>
                  <ProgressBar value={temperatureUsage} color="#F7D046" />
                </div>
              </div>
              <div className="text-center text-sm text-gray-600">
                Thermal Management
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 系统概览 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">System Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">{cpuUsage.toFixed(1)}%</div>
              <div className="text-gray-600">CPU Load</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">{memoryUsage.toFixed(1)}%</div>
              <div className="text-gray-600">Memory Used</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">{gpuUsage.toFixed(1)}%</div>
              <div className="text-gray-600">GPU Load</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">{temperatureUsage.toFixed(0)}°C</div>
              <div className="text-gray-600">Temperature</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
