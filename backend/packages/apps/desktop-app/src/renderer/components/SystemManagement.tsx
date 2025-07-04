import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  Activity, 
  Power, 
  RotateCcw, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  List,
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
  onRestartBackend: () => void;
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

interface TaskInfo {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  progress: number;
  startTime: string;
}

export const SystemManagement: React.FC<SystemManagementProps> = ({ 
  backendStatus, 
  onRestartBackend 
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
  const [tasks, setTasks] = useState<TaskInfo[]>([
    {
      id: '1',
      name: '模型训练任务 #001',
      status: 'running',
      progress: 75,
      startTime: '2024-01-15 10:30:00'
    },
    {
      id: '2',
      name: '数据处理任务 #002',
      status: 'completed',
      progress: 100,
      startTime: '2024-01-15 09:15:00'
    },
    {
      id: '3',
      name: '模型验证任务 #003',
      status: 'pending',
      progress: 0,
      startTime: '2024-01-15 11:00:00'
    }
  ]);

  // 获取系统状态
  const fetchSystemStats = async () => {
    try {
      const response = await fetch('http://localhost:8716/api/v1/miner/deviceStatus');
      const data = await response.json();

      if (data.success) {
        // 更新系统状态（根据实际 API 响应调整）
        setSystemStats(prev => ({
          ...prev,
          networkStatus: data.status === 'online' ? 'connected' : 'disconnected'
        }));
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  // 获取收益数据
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

  // 获取任务列表
  const fetchTaskList = async () => {
    try {
      const response = await fetch('http://localhost:8716/api/v1/miner/connect-task-list');
      const data = await response.json();

      if (data.success && data.tasks) {
        const formattedTasks = data.tasks.map((task: any, index: number) => ({
          id: task.id || `task-${index}`,
          name: task.name || `任务 ${index + 1}`,
          status: task.status || 'pending',
          progress: task.progress || 0,
          startTime: task.startTime || new Date().toISOString()
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error('Error fetching task list:', error);
    }
  };

  // 获取开机自启动状态
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
    // 初始加载数据
    fetchSystemStats();
    fetchEarningsData();
    fetchTaskList();
    fetchAutoStartStatus();

    // 定期更新数据
    const interval = setInterval(() => {
      fetchSystemStats();
      fetchEarningsData();
      fetchTaskList();

      // 模拟系统资源使用率变化（这些通常需要系统级 API）
      setSystemStats(prev => ({
        ...prev,
        cpuUsage: Math.max(20, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(30, Math.min(95, prev.memoryUsage + (Math.random() - 0.5) * 5))
      }));
    }, 10000); // 每10秒更新一次

    return () => clearInterval(interval);
  }, []);

  const handleAutoStartToggle = async (checked: boolean) => {
    setAutoStart(checked);

    try {
      // 通过 IPC 与主进程通信设置开机自启动
      if (window.electronAPI) {
        const result = await window.electronAPI.setAutoStart(checked);
        if (result.success) {
          console.log('Auto start setting updated:', checked);
        } else {
          console.error('Failed to update auto start setting:', result.error);
          // 如果设置失败，恢复原状态
          setAutoStart(!checked);
        }
      }
    } catch (error) {
      console.error('Error setting auto start:', error);
      // 如果设置失败，恢复原状态
      setAutoStart(!checked);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      case 'pending': return <List className="h-4 w-4" />;
      default: return <List className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 min-h-0">
      {/* 运行状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">服务状态</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backendStatus.isRunning ? '运行中' : '已停止'}
            </div>
            <p className="text-xs text-muted-foreground">
              端口: {backendStatus.port}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU 使用率</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.cpuUsage.toFixed(1)}%</div>
            <Progress value={systemStats.cpuUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">内存使用率</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.memoryUsage.toFixed(1)}%</div>
            <Progress value={systemStats.memoryUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">网络状态</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats.networkStatus === 'connected' ? '已连接' : '未连接'}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemStats.networkStatus === 'connected' ? '网络正常' : '网络异常'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 系统控制 */}
      <Card>
        <CardHeader>
          <CardTitle>系统控制</CardTitle>
          <CardDescription>管理系统服务和设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">开机自启动</div>
              <div className="text-sm text-muted-foreground">
                系统启动时自动启动 SightAI Desktop
              </div>
            </div>
            <Switch
              checked={autoStart}
              onCheckedChange={handleAutoStartToggle}
            />
          </div>
          
          <Separator />
          
          <div className="flex gap-2">
            <Button 
              onClick={onRestartBackend}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              重启后端服务
            </Button>
            <Button 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Power className="h-4 w-4" />
              停止服务
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 收益情况 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            收益情况
          </CardTitle>
          <CardDescription>查看挖矿收益统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${earnings.today}</div>
              <div className="text-sm text-muted-foreground">今日收益</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${earnings.thisWeek}</div>
              <div className="text-sm text-muted-foreground">本周收益</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${earnings.thisMonth}</div>
              <div className="text-sm text-muted-foreground">本月收益</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${earnings.total}</div>
              <div className="text-sm text-muted-foreground">总收益</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            任务列表
          </CardTitle>
          <CardDescription>当前运行的任务和历史记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={getStatusColor(task.status)}>
                    {getStatusIcon(task.status)}
                  </div>
                  <div>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-sm text-muted-foreground">
                      开始时间: {task.startTime}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                    {task.status === 'running' ? '运行中' : 
                     task.status === 'completed' ? '已完成' :
                     task.status === 'failed' ? '失败' : '等待中'}
                  </div>
                  {task.status === 'running' && (
                    <Progress value={task.progress} className="w-20 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
