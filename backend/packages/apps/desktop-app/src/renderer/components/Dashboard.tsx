import React, { useState, useEffect } from 'react';
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

  // Fetch real system resources
  const fetchSystemResources = async () => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/app/system-resources`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update metrics from enhanced real data
          setMetrics({
            cpu: data.data.cpu?.usage || data.data.cpuUsage || 0,
            memory: data.data.memory?.usage || data.data.memoryUsage || 0,
            gpu: data.data.gpus?.[0]?.usage || 0,
            temperature: data.data.gpus?.[0]?.temperature || 0,
            network: Math.min(((data.data.network?.rx || 0) + (data.data.network?.tx || 0)) / 1024 / 1024, 100) // Convert to MB/s and cap at 100
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch system resources:', error);
      // Set default values on error
      setMetrics({
        cpu: 0,
        memory: 0,
        gpu: 0,
        temperature: 0,
        network: 0
      });
    }
  };

  // Fetch app status
  const fetchAppStatus = async () => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/app/status`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update services status based on real data
          setServices(prev => prev.map(service => {
            switch (service.name) {
              case 'Backend API':
                return { ...service, status: 'online', uptime: '24h+', connections: 1 };
              case 'Model Framework':
                return {
                  ...service,
                  status: data.data.framework.available ? 'online' : 'offline',
                  uptime: data.data.framework.available ? '12h+' : '0m',
                  connections: data.data.framework.models.length
                };
              case 'Gateway Connection':
                return {
                  ...service,
                  status: data.data.device.healthy ? 'online' : 'warning',
                  uptime: data.data.device.healthy ? '6h+' : '0m',
                  connections: data.data.device.healthy ? 1 : 0
                };
              default:
                return service;
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch app status:', error);
    }
  };

  // Fetch earnings data using new dashboard API
  const fetchEarnings = async () => {
    if (!backendStatus.isRunning) return;

    try {
      // Fetch dashboard statistics which includes earnings and task data
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/dashboard/statistics`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const stats = data.data;
          setEarnings({
            today: stats.todayEarnings?.totalEarnings || 0,
            total: stats.cumulativeEarnings?.totalEarnings || 0,
            tasks: stats.totalTasks || 0,
            efficiency: stats.up_time_percentage || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      // Set default values on error
      setEarnings({
        today: 0,
        total: 0,
        tasks: 0,
        efficiency: 0
      });
    }
  };

  // Real-time data updates
  useEffect(() => {
    if (!backendStatus.isRunning) return;

    // Initial fetch
    fetchSystemResources();
    fetchAppStatus();
    fetchEarnings();

    // Set up intervals for real-time updates
    const systemInterval = setInterval(fetchSystemResources, 3000);
    const statusInterval = setInterval(fetchAppStatus, 10000);
    const earningsInterval = setInterval(fetchEarnings, 30000);

    return () => {
      clearInterval(systemInterval);
      clearInterval(statusInterval);
      clearInterval(earningsInterval);
    };
  }, [backendStatus]);





  return (
    <div className="space-y-6 p-6 bg-white">
      {/* Basic Information Section */}
      <Card className="bg-white rounded-2xl border-0" style={{ boxShadow: '0px 0px 44px 0px rgba(232, 232, 232, 1)' }}>
        <CardContent className="p-8 space-y-9">
          <h2 className="text-2xl font-medium text-black">Basic Information</h2>

          <div className="flex gap-11">
            {/* SIGHTAI_SYSTEM_STATUS */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value="ONLINE"
                  readOnly
                  className="w-full px-6 py-4 text-base text-green-500 bg-white border-2 border-gray-400 focus:outline-none font-normal"
                  style={{
                    textShadow: '0px 0px 10.3px rgba(130, 255, 153, 1)',
                    borderRadius: '18px'
                  }}
                />
                <label className="absolute -top-2 left-4 px-2 text-xs text-gray-600 bg-white">
                  SIGHTAI_SYSTEM_STATUS
                </label>
                <div className="mt-2 px-6 text-xs text-green-500" style={{ textShadow: '0px 0px 10.3px rgba(130, 255, 153, 1)' }}>
                  [PORT: {backendStatus.port || 8761}]
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
