import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import {
  Activity,
  DollarSign,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface SystemManagementProps {
  backendStatus: BackendStatus;
}

interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkStatus: 'connected' | 'disconnected';
}

interface EarningsData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
}



export const SystemManagement: React.FC<SystemManagementProps> = ({
  backendStatus
}) => {
  const [autoStart, setAutoStart] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    cpuUsage: 45,
    memoryUsage: 62,
    diskUsage: 78,
    networkStatus: 'connected'
  });
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 12.45,
    thisWeek: 89.32,
    thisMonth: 356.78,
    total: 1234.56
  });

  // Get system status
  const fetchSystemStats = async () => {
    try {
      // First get device config to obtain deviceId
      if (window.electronAPI) {
        const deviceConfigResult = await window.electronAPI.readDeviceConfig();
        if (deviceConfigResult.success && deviceConfigResult.data?.deviceId) {
          const deviceId = deviceConfigResult.data.deviceId;
          const response = await fetch(`http://localhost:8716/api/v1/miner/deviceStatus?deviceId=${encodeURIComponent(deviceId)}`);
          const data = await response.json();

          if (data && data.status) {
            // Update system status (adjust according to actual API response)
            setSystemStats(prev => ({
              ...prev,
              networkStatus: data.status === 'connected' ? 'connected' : 'disconnected'
            }));
          }
        } else {
          console.warn('Device not configured, skipping device status fetch');
        }
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  // Get earnings data
  const fetchEarningsData = async () => {
    try {
      const response = await fetch('http://localhost:8716/api/v1/miner/summary');
      const data = await response.json();

      if (data.success) {
        setEarnings({
          today: data.earnings?.today || 0,
          thisWeek: data.earnings?.thisWeek || 0,
          thisMonth: data.earnings?.thisMonth || 0,
          total: data.earnings?.total || 0
        });
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    }
  };

  // Get auto-start status
  const fetchAutoStartStatus = async () => {
    try {
      if (window.electronAPI) {
        const autoStartEnabled = await window.electronAPI.getAutoStart();
        setAutoStart(autoStartEnabled);
      }
    } catch (error) {
      console.error('Error fetching auto start status:', error);
    }
  };

  useEffect(() => {
    // Initial data loading
    fetchSystemStats();
    fetchEarningsData();
    fetchAutoStartStatus();

    // Periodic data updates
    const interval = setInterval(() => {
      fetchSystemStats();
      fetchEarningsData();

      // Simulate system resource usage changes (these usually require system-level APIs)
      setSystemStats(prev => ({
        ...prev,
        cpuUsage: Math.max(20, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(30, Math.min(95, prev.memoryUsage + (Math.random() - 0.5) * 5))
      }));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleAutoStartToggle = async (checked: boolean) => {
    setAutoStart(checked);

    try {
      // Communicate with main process via IPC to set auto-start
      if (window.electronAPI) {
        const result = await window.electronAPI.setAutoStart(checked);
        if (result.success) {
          console.log('Auto start setting updated:', checked);
        } else {
          console.error('Failed to update auto start setting:', result.error);
          // If setting fails, restore original state
          setAutoStart(!checked);
        }
      }
    } catch (error) {
      console.error('Error setting auto start:', error);
      // If setting fails, restore original state
      setAutoStart(!checked);
    }
  };

  return (
    <div className="space-y-6 min-h-0">
      {/* Runtime Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backendStatus.isRunning ? 'Running' : 'Stopped'}
            </div>
            <p className="text-xs text-muted-foreground">
              Port: {backendStatus.port}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.cpuUsage.toFixed(1)}%</div>
            <Progress value={systemStats.cpuUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.memoryUsage.toFixed(1)}%</div>
            <Progress value={systemStats.memoryUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Status</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats.networkStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemStats.networkStatus === 'connected' ? 'Network Normal' : 'Network Error'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Control */}
      <Card>
        <CardHeader>
          <CardTitle>System Control</CardTitle>
          <CardDescription>Manage system services and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Auto Start</div>
              <div className="text-sm text-muted-foreground">
                Automatically start SightAI Desktop when system boots
              </div>
            </div>
            <Switch
              checked={autoStart}
              onCheckedChange={handleAutoStartToggle}
            />
          </div>

        </CardContent>
      </Card>

      {/* Earnings Overview */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Earnings Overview
          </CardTitle>
          <CardDescription>View mining earnings statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${earnings.today}</div>
              <div className="text-sm text-muted-foreground">Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${earnings.thisWeek}</div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${earnings.thisMonth}</div>
              <div className="text-sm text-muted-foreground">This Month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${earnings.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};
