/**
 * Dashboard页面组件 - 严格按照Figma设计实现
 *
 * 遵循SOLID原则：
 * - 单一职责原则：UI组件只负责展示，业务逻辑由Hook处理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：使用专门的Hook接口
 */

import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Cpu,
  HardDrive,
  Monitor,
  Server,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { BackendStatus } from '../hooks/types';

interface CyberDashboardProps {
  backendStatus: BackendStatus;
}

/**
 * 基础信息组件 - 严格按照Figma设计实现
 */
const BasicInformation: React.FC<{
  systemStatus: string;
  systemPort: string;
  version: string;
  uptime: string;
  taskCompleted: number;
  todayEarnings: number;
  totalEarnings: number;
  isLoading: boolean;
}> = ({
  systemStatus,
  systemPort,
  version,
  uptime,
  taskCompleted,
  todayEarnings,
  totalEarnings,
  isLoading
}) => {
  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center p-8">
  //       <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
  //       <span className="ml-2 text-gray-500">Loading system information...</span>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-9">
      <h2 className="text-2xl font-medium text-black" style={{ fontSize: '24px', fontWeight: 500, lineHeight: '28.8px', letterSpacing: '-0.48px' }}>
        Basic Information
      </h2>

      {/* 系统信息输入框 - 按照Figma设计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* SIGHTAI_SYSTEM_STATUS */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-6 py-3 bg-white" style={{ borderRadius: '18px', borderColor: '#79747E', borderWidth: '1.5px' }}>
              <div className="text-base text-green-500 font-normal" style={{
                fontFamily: 'Roboto',
                fontSize: '16px',
                lineHeight: '24px',
                letterSpacing: '0.5px',
                color: '#00C13A',
                textShadow: '0px 0px 10.3px rgba(130, 255, 153, 1)'
              }}>
                {systemStatus}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600" style={{
                fontFamily: 'Roboto',
                fontSize: '12px',
                lineHeight: '16px',
                letterSpacing: '0.4px',
                color: '#49454F'
              }}>
                SIGHTAI_SYSTEM_STATUS
              </div>
            </div>
            <div className="mt-1.5 px-6 text-xs text-green-500" style={{
              fontFamily: 'Roboto',
              fontSize: '12px',
              lineHeight: '16px',
              letterSpacing: '0.4px',
              color: '#00C13A',
              textShadow: '0px 0px 10.3px rgba(130, 255, 153, 1)'
            }}>
              [PORT: {systemPort}]
            </div>
          </div>
        </div>

        {/* Version */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-6 py-3 bg-white" style={{ borderRadius: '18px', borderColor: '#79747E', borderWidth: '1.5px' }}>
              <div className="text-base text-gray-900 font-normal" style={{
                fontFamily: 'Roboto',
                fontSize: '16px',
                lineHeight: '24px',
                letterSpacing: '0.5px',
                color: '#1D1B20'
              }}>
                {version}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600" style={{
                fontFamily: 'Roboto',
                fontSize: '12px',
                lineHeight: '16px',
                letterSpacing: '0.4px',
                color: '#49454F'
              }}>
                Version
              </div>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-6 py-3 bg-white" style={{ borderRadius: '18px', borderColor: '#79747E', borderWidth: '1.5px' }}>
              <div className="text-base text-gray-900 font-normal" style={{
                fontFamily: 'Roboto',
                fontSize: '16px',
                lineHeight: '24px',
                letterSpacing: '0.5px',
                color: '#1D1B20'
              }}>
                {uptime}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600" style={{
                fontFamily: 'Roboto',
                fontSize: '12px',
                lineHeight: '16px',
                letterSpacing: '0.4px',
                color: '#49454F'
              }}>
                Uptime
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 - 按照Figma设计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Task Completed */}
        <div className="h-26 bg-white rounded-2xl flex items-center justify-center min-w-0">
          <div className="text-center">
            <div className="text-4xl font-normal text-gray-600 mb-1" style={{
              fontFamily: 'Aldrich',
              fontSize: '36px',
              lineHeight: '24px',
              letterSpacing: '0.6px',
              color: '#49454F'
            }}>
              {taskCompleted}
            </div>
            <div className="text-lg font-normal text-gray-600" style={{
              fontFamily: 'Roboto',
              fontSize: '18px',
              lineHeight: '24px',
              letterSpacing: '0.6px',
              color: '#49454F'
            }}>
              Task Completed
            </div>
          </div>
        </div>

        {/* Today Earnings */}
        <div className="h-26 bg-white rounded-2xl flex items-center justify-center min-w-0">
          <div className="text-center">
            <div className="text-4xl font-normal text-gray-600 mb-1" style={{
              fontFamily: 'Aldrich',
              fontSize: '36px',
              lineHeight: '24px',
              letterSpacing: '0.6px',
              color: '#49454F'
            }}>
              $ {todayEarnings.toFixed(2)}
            </div>
            <div className="text-lg font-normal text-gray-600" style={{
              fontFamily: 'Roboto',
              fontSize: '18px',
              lineHeight: '24px',
              letterSpacing: '0.6px',
              color: '#49454F'
            }}>
              Today Earnings
            </div>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="h-26 bg-white rounded-2xl flex items-center justify-center min-w-0">
          <div className="text-center">
            <div className="text-4xl font-normal text-gray-600 mb-1" style={{
              fontFamily: 'Aldrich',
              fontSize: '36px',
              lineHeight: '24px',
              letterSpacing: '0.6px',
              color: '#49454F'
            }}>
              $ {totalEarnings.toFixed(2)}
            </div>
            <div className="text-lg font-normal text-gray-600" style={{
              fontFamily: 'Roboto',
              fontSize: '18px',
              lineHeight: '24px',
              letterSpacing: '0.6px',
              color: '#49454F'
            }}>
              Total Earnings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 系统资源性能组件 - 严格按照Figma设计实现
 */
const SystemResourcePerformance: React.FC<{
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  temperatureUsage: number;
  services: Array<{
    name: string;
    status: 'online' | 'offline' | 'warning';
    uptime: string;
    connections: number;
    icon?: string;
  }>;
  isLoading: boolean;
}> = ({ cpuUsage, memoryUsage, gpuUsage, temperatureUsage, services, isLoading }) => {
  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center p-8">
  //       <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
  //       <span className="ml-2 text-gray-500">Loading system metrics...</span>
  //     </div>
  //   );
  // }

  // 进度条组件
  const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <div className="w-full bg-gray-200 rounded-sm h-3 relative">
      <div className="absolute inset-0 bg-gray-200 rounded-sm" style={{ backgroundColor: '#E7E7E7' }} />
      <div
        className="h-3 rounded-sm transition-all duration-300 relative"
        style={{
          width: `${Math.min(value, 100)}%`,
          background: color
        }}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-medium text-black" style={{ fontSize: '24px', fontWeight: 500, lineHeight: '28.8px', letterSpacing: '-0.48px' }}>
        System Resource Performance
      </h2>

      {/* 系统指标网格 - 按照Figma设计 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* CPU */}
        <Card className="bg-white rounded-xl border-0 p-4 min-w-0" style={{
          boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)',
          borderRadius: '12px'
        }}>
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-7 w-7 text-gray-800" strokeWidth={2} style={{ width: '26px', height: '26px', color: '#1E1E1E' }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-base text-gray-800" style={{
                    fontFamily: 'Roboto',
                    fontSize: '16px',
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}>
                    CPU
                  </span>
                  <span className="text-base font-medium text-gray-800" style={{
                    fontFamily: 'Roboto',
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}>
                    {cpuUsage.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar value={cpuUsage} color="#000000" />
              </div>
            </div>
            <div className="text-center text-base" style={{
              fontFamily: 'Roboto',
              fontSize: '16px',
              lineHeight: '24px',
              letterSpacing: '0.5px',
              color: '#000000'
            }}>
              Neural Processing Unit
            </div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card className="bg-white rounded-xl border-0 p-4 min-w-0" style={{
          boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)',
          borderRadius: '12px'
        }}>
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-6 w-6 text-gray-800" strokeWidth={2} style={{ width: '24px', height: '24px', color: '#1E1E1E' }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-base text-gray-800" style={{
                    fontFamily: 'Roboto',
                    fontSize: '16px',
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}>
                    Memory
                  </span>
                  <span className="text-base font-medium text-gray-800" style={{
                    fontFamily: 'Roboto',
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}>
                    {memoryUsage.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar value={memoryUsage} color="#6D20F5" />
              </div>
            </div>
            <div className="text-center text-base" style={{
              fontFamily: 'Roboto',
              fontSize: '16px',
              lineHeight: '24px',
              letterSpacing: '0.5px',
              color: '#000000'
            }}>
              Data Storage Buffer
            </div>
          </CardContent>
        </Card>

        {/* GPU */}
        <Card className="bg-white rounded-xl border-0 p-4 min-w-0" style={{
          boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)',
          borderRadius: '12px'
        }}>
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center gap-2">
              <Monitor className="h-6 w-6 text-gray-800" strokeWidth={2} style={{ width: '25px', height: '25px', color: '#1E1E1E' }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-base text-gray-800" style={{
                    fontFamily: 'Roboto',
                    fontSize: '16px',
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}>
                    GPU
                  </span>
                  <span className="text-base font-medium text-gray-800" style={{
                    fontFamily: 'Roboto',
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}>
                    {gpuUsage.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar value={gpuUsage} color="#E7337A" />
              </div>
            </div>
            <div className="text-center text-base" style={{
              fontFamily: 'Roboto',
              fontSize: '16px',
              lineHeight: '24px',
              letterSpacing: '0.5px',
              color: '#000000'
            }}>
              Graphics Rendering Unit
            </div>
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card className="bg-white rounded-xl border-0 p-4 min-w-0" style={{
          boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)',
          borderRadius: '12px'
        }}>
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-gray-800" strokeWidth={2} style={{ width: '26px', height: '26px', color: '#1E1E1E' }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-base text-gray-800" style={{
                    fontFamily: 'Roboto',
                    fontSize: '16px',
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}>
                    Temp
                  </span>
                  <span className="text-base font-medium text-gray-800" style={{
                    fontFamily: 'Roboto',
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.5px',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}>
                    {temperatureUsage.toFixed(0)}°C
                  </span>
                </div>
                <ProgressBar value={temperatureUsage} color="#F7D046" />
              </div>
            </div>
            <div className="text-center text-base" style={{
              fontFamily: 'Roboto',
              fontSize: '16px',
              lineHeight: '24px',
              letterSpacing: '0.5px',
              color: '#000000'
            }}>
              Thermal Management
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 服务状态 - 按照Figma设计 */}
      <div className="space-y-3 mt-3 pt-4">
        <div className="space-y-3">
          {services.map((service, index) => (
            <Card key={index} className="bg-white rounded-lg border-0 p-2" style={{
              boxShadow: '0px 0px 40px 0px rgba(213, 213, 213, 0.57)',
              borderRadius: '8px',
              width: '400px'
            }}>
              <CardContent className="p-0">
                <div className="flex items-center justify-center gap-8 px-1.5 py-2">
                  <div className="flex items-center gap-3">
                    {/* 服务图标 */}
                    <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0" style={{
                      backgroundImage: service.icon ? `url(${service.icon})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }} />
                    <div style={{ width: '221px' }}>
                      <div className="font-normal text-black text-sm" style={{
                        fontFamily: 'Roboto',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0.25px',
                        color: '#000000'
                      }}>
                        {service.name}
                      </div>
                      <div className="text-sm text-black" style={{
                        fontFamily: 'Roboto',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0.25px',
                        color: '#000000'
                      }}>
                        Uptime: {service.uptime} ｜Connections: {service.connections}
                      </div>
                    </div>
                  </div>
                  <Button
                    className={`px-2 py-2 rounded-full text-base font-normal ${
                      service.status === 'online' ? 'bg-gray-800 text-gray-100' :
                      service.status === 'warning' ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}
                    style={{
                      width: '87px',
                      height: '32px',
                      borderRadius: '9999px',
                      backgroundColor: service.status === 'online' ? '#191717' :
                                     service.status === 'warning' ? '#F59E0B' : '#EF4444',
                      color: '#F5F5F5',
                      fontFamily: 'Inter',
                      fontSize: '16px',
                      lineHeight: '16px'
                    }}
                  >
                    {service.status === 'online' ? 'Online' :
                     service.status === 'warning' ? 'Warning' : 'Offline'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 主Dashboard组件 - 遵循依赖倒置原则，严格按照Figma设计实现
 */
export const CyberDashboard: React.FC<CyberDashboardProps> = ({ backendStatus }) => {
  // 使用专用Dashboard Hook获取数据 - 依赖倒置原则
  const { data, loading, refresh } = useDashboard(backendStatus);

  // 错误状态处理
  if (loading.error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Failed to load dashboard data</h3>
            <p className="text-sm text-red-600 mt-1">{loading.error}</p>
            <button
              onClick={refresh}
              className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-lg space-y-9 m-3"
      style={{
        width: '1225px',
        height: '1050px',
        borderRadius: '16px',
        boxShadow: '0px 0px 42.4px 7px rgba(237, 237, 237, 1)',
        padding: '27px 26px'
      }}
    >
      {/* Basic Information Section */}
      <Card className="bg-white rounded-xl shadow-lg" style={{
        borderRadius: '12px',
        boxShadow: '0px 0px 44px 0px rgba(232, 232, 232, 1)',
        padding: '30px 38px 43px'
      }}>
        <CardContent className="p-0">
          <BasicInformation
            systemStatus={data?.systemInfo?.status || 'OFFLINE'}
            systemPort={data?.systemInfo?.port || '8761'}
            version={data?.systemInfo?.version || 'v0.9.3 Beta'}
            uptime={data?.systemInfo?.uptime || '0d 0h 0min'}
            taskCompleted={data?.earnings?.tasks || 0}
            todayEarnings={data?.earnings?.today || 0}
            totalEarnings={data?.earnings?.total || 0}
            isLoading={loading.isLoading}
          />
        </CardContent>
      </Card>

      {/* System Resource Performance Section */}
      <div className="space-y-4">
        <SystemResourcePerformance
          cpuUsage={data?.systemResources?.cpu?.usage || 0}
          memoryUsage={data?.systemResources?.memory?.usage || 0}
          gpuUsage={data?.systemResources?.gpu?.usage || 0}
          temperatureUsage={data?.systemResources?.gpu?.temperature || 0}
          services={data?.services || [
            { name: 'Backend API', status: 'online', uptime: '24h+', connections: 1 },
            { name: 'Local Model Service', status: 'online', uptime: '12h+', connections: 2 },
            { name: 'Gateway Connection', status: 'warning', uptime: '0m', connections: 0 },
            { name: 'LibP2P Communication', status: 'online', uptime: '0m', connections: 0 }
          ]}
          isLoading={loading.isLoading}
        />
      </div>
    </div>
  );
};
