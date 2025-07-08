import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Activity,
  Cpu,
  HardDrive,
  Monitor,
  Server,
  Wifi
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

interface SystemResources {
  cpu: {
    model: string;
    cores: number;
    usage: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  gpus: Array<{
    name: string;
    memory: number;
    usage: number;
    temperature: number;
    vendor: string;
  }>;
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  os: {
    name: string;
    version: string;
    arch: string;
    uptime: number;
  };
  cpuUsage: number;
  memoryUsage: number;
  timestamp: string;
}

interface AppStatus {
  isReady: boolean;
  framework: {
    type: 'ollama' | 'vllm' | null;
    available: boolean;
    version?: string;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'status-online';
      case 'offline': return 'status-offline';
      case 'warning': return 'status-warning';
      default: return 'text-muted-foreground';
    }
  };



  return (
    <div className="space-y-6">
      {/* System Status Header */}
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-magenta-500 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">NEURAL INTERFACE</h1>
              <p className="text-cyan-400/80 font-mono text-sm">System Status Dashboard</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400 font-mono">{earnings.tasks}</div>
            <div className="text-xs text-muted-foreground font-mono">TASKS COMPLETED</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 font-mono">${earnings.today.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground font-mono">TODAY EARNINGS</div>
          </div>
          {/* <div className="text-center">
            <div className="text-2xl font-bold text-magenta-400 font-mono">{earnings.efficiency}%</div>
            <div className="text-xs text-muted-foreground font-mono">EFFICIENCY</div>
          </div> */}
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 font-mono">${earnings.total.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground font-mono">TOTAL EARNINGS</div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cyber-metric-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-cyan-400" />
              <span className="cyber-metric-label">CPU</span>
            </div>
            <span className="cyber-metric-value">{metrics.cpu.toFixed(1)}%</span>
          </div>
          <div className="cyber-progress h-3 mb-2">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded transition-all duration-500"
              style={{ width: `${metrics.cpu}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">Neural Processing Unit</div>
        </div>

        <div className="cyber-metric-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-magenta-400" />
              <span className="cyber-metric-label">MEMORY</span>
            </div>
            <span className="cyber-metric-value">{metrics.memory.toFixed(1)}%</span>
          </div>
          <div className="cyber-progress h-3 mb-2">
            <div
              className="h-full bg-gradient-to-r from-magenta-400 to-purple-500 rounded transition-all duration-500"
              style={{ width: `${metrics.memory}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">Data Storage Buffer</div>
        </div>

        <div className="cyber-metric-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-green-400" />
              <span className="cyber-metric-label">GPU</span>
            </div>
            <span className="cyber-metric-value">{metrics.gpu.toFixed(1)}%</span>
          </div>
          <div className="cyber-progress h-3 mb-2">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded transition-all duration-500"
              style={{ width: `${metrics.gpu}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">Graphics Accelerator</div>
        </div>

        <div className="cyber-metric-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Wifi className="h-5 w-5 text-yellow-400" />
              <span className="cyber-metric-label">NETWORK</span>
            </div>
            <span className="cyber-metric-value">{metrics.network.toFixed(1)} MB/s</span>
          </div>
          <div className="cyber-progress h-3 mb-2">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded transition-all duration-500"
              style={{ width: `${Math.min(metrics.network * 10, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">Data Transfer Rate</div>
        </div>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="cyber-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Server className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-cyan-400 font-mono">SERVICE STATUS</h3>
          </div>
          <div className="space-y-3">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-cyan-500/20">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    service.status === 'online' ? 'bg-green-400' : 
                    service.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                  } animate-pulse`} />
                  <div>
                    <div className="text-sm font-mono text-foreground">{service.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Uptime: {service.uptime} | Connections: {service.connections}
                    </div>
                  </div>
                </div>
                <Badge className={`cyber-badge ${getStatusColor(service.status)}`}>
                  {service.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </div>
{/* 
        <div className="cyber-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Brain className="h-5 w-5 text-magenta-400" />
            <h3 className="text-lg font-bold text-magenta-400 font-mono">AI PERFORMANCE</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-muted-foreground">Model Accuracy</span>
              <span className="text-sm font-mono text-green-400">98.7%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-muted-foreground">Inference Speed</span>
              <span className="text-sm font-mono text-cyan-400">127ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-muted-foreground">Active Models</span>
              <span className="text-sm font-mono text-magenta-400">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-muted-foreground">Queue Length</span>
              <span className="text-sm font-mono text-yellow-400">3</span>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};
