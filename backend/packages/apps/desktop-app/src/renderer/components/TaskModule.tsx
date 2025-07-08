import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import {
  Activity,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Calendar
} from 'lucide-react';

/**
 * 任务历史接口
 */
interface TaskHistoryResponse {
  page: number;
  limit: number;
  total: number;
  tasks: Task[];
}

interface Task {
  id: string;
  model: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  total_duration?: number | null;
  load_duration?: number | null;
  prompt_eval_count?: number | null;
  prompt_eval_duration?: number | null;
  eval_count?: number | null;
  eval_duration?: number | null;
  source: 'local' | 'gateway';
  device_id?: string | null;
  earnings?: number;
  block_rewards?: number;
  job_rewards?: number;
}

/**
 * 收益信息接口
 */
interface EarningsInfo {
  earning_info: {
    total_block_rewards: number;
    total_job_rewards: number;
  };
  device_info: {
    name: string;
    status: string;
  };
  statistics: {
    up_time_percentage: number;
    earning_serials: number[];
    request_serials: number[];
    task_activity: any[];
  };
}

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface TaskModuleProps {
  backendStatus: BackendStatus;
}

export const TaskModule: React.FC<TaskModuleProps> = ({ backendStatus }) => {
  const [taskHistory, setTaskHistory] = useState<TaskHistoryResponse | null>(null);
  const [earningsInfo, setEarningsInfo] = useState<EarningsInfo | null>(null);
  const [runningTasks, setRunningTasks] = useState<Task[]>([]);
  const [connectTasks, setConnectTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // 获取任务历史数据
  const fetchTaskHistory = async (page: number = 1) => {
    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/miner/history?page=${page}&limit=10`);
      const data = await response.json();
      console.log(data)
      setTaskHistory(data);
      // 从历史数据中过滤出正在运行的任务
      if (data.tasks) {
        const running = data.tasks.filter((task: Task) => task.status === 'running' || task.status === 'pending');
        setRunningTasks(running);
      }
    } catch (error) {
      console.error('Error fetching task history:', error);
      setError('Failed to fetch task history');
    }
  };

  // 获取正在运行的任务（从推理任务历史中过滤）
  const fetchRunningTasks = async () => {
    try {
      // 获取更多的历史记录来查找正在运行的任务
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/miner/history?page=1&limit=50`);
      const data = await response.json();

      if (data.tasks) {
        // 从推理任务历史中过滤出正在运行的任务
        const running = data.tasks.filter((task: Task) =>
          task.status === 'running' ||
          task.status === 'pending'
        );
        setRunningTasks(running);
      } else {
        setRunningTasks([]);
      }
    } catch (error) {
      console.error('Error fetching running tasks from history:', error);
      setRunningTasks([]);
    }
  };

  // 获取连接任务数据
  const fetchConnectTasks = async () => {
    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/miner/connect-task-list?page=1&limit=10`);
      const data = await response.json();

      if (data.success && data.data && data.data.data) {
        setConnectTasks(data.data.data);
      } else {
        // 如果获取失败，设置为空数组但不显示错误（因为可能是配置问题）
        setConnectTasks([]);
        console.warn('Connect task list not available:', data.message);
      }
    } catch (error) {
      console.warn('Error fetching connect tasks:', error);
      setConnectTasks([]);
    }
  };

  // 获取收益数据
  const fetchEarningsInfo = async () => {
    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/miner/summary`);
      const data = await response.json();
      setEarningsInfo(data);
    } catch (error) {
      console.error('Error fetching earnings info:', error);
      setError('Failed to fetch earnings information');
    }
  };

  // 初始化数据加载
  useEffect(() => {
    if (backendStatus.isRunning) {
      loadData();
    }
  }, [backendStatus.isRunning]);

  // 自动刷新正在运行的任务（每30秒）
  useEffect(() => {
    if (!backendStatus.isRunning) return;

    const interval = setInterval(() => {
      fetchRunningTasks();
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [backendStatus.isRunning]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchTaskHistory(currentPage),
        fetchEarningsInfo(),
        fetchRunningTasks(),
        fetchConnectTasks()
      ]);
    } catch (error) {
      setError('Failed to load task module data');
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // 格式化持续时间
  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // 获取任务状态图标
  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  // 获取任务状态颜色
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!backendStatus.isRunning) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Backend service is not running. Please start the service to view task information.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading task module data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Task Module</h2>
          <p className="text-sm text-muted-foreground">
            Manage tasks and view earnings information
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="running" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="running">Running Tasks</TabsTrigger>
          <TabsTrigger value="connect">Connect Tasks</TabsTrigger>
          <TabsTrigger value="earnings">Earnings Overview</TabsTrigger>
          <TabsTrigger value="history">Task History</TabsTrigger>
        </TabsList>

        {/* Running Tasks Tab */}
        <TabsContent value="running" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Currently Running Tasks
              </CardTitle>
              <CardDescription>
                Tasks that are currently being processed or pending execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runningTasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Expected Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runningTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTaskStatusIcon(task.status)}
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{task.model || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {task.source}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(task.created_at)}</TableCell>
                        <TableCell>
                          {task.status === 'running' ? (
                            <div className="flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>{formatDuration(task.total_duration)}</span>
                            </div>
                          ) : (
                            formatDuration(task.total_duration)
                          )}
                        </TableCell>
                        <TableCell>
                          {task.earnings ? `${task.earnings.toFixed(4)}` : 'Calculating...'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks currently running</p>
                  <p className="text-sm">Running tasks will appear here when they start</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats for Running Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {runningTasks.filter(task =>
                    task.status === 'running'
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently executing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {runningTasks.filter(task =>
                    task.status === 'pending'
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Waiting to start
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Queue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {runningTasks.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  All active tasks
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Connect Tasks Tab */}
        <TabsContent value="connect" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Connection Tasks
              </CardTitle>
              <CardDescription>
                Tasks related to gateway connections and network communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectTasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connectTasks.map((task, index) => (
                      <TableRow key={task.id || index}>
                        <TableCell className="font-mono text-sm">
                          {task.id || `task-${index}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {task.status || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.type || 'connection'}</TableCell>
                        <TableCell>
                          {task.created_at ? new Date(task.created_at).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {task.updated_at ? new Date(task.updated_at).toLocaleString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No connection tasks available</p>
                  <p className="text-sm">Connection tasks will appear here when gateway is properly configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Block Rewards</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {earningsInfo?.earning_info.total_block_rewards.toFixed(4) || '0.0000'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Block mining rewards
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Job Rewards</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {earningsInfo?.earning_info.total_job_rewards.toFixed(4) || '0.0000'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Task completion rewards
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Device Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {earningsInfo?.device_info.status || 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {earningsInfo?.device_info.name || 'Device'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {earningsInfo?.statistics.up_time_percentage.toFixed(1) || '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground">
                  System availability
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings Trend</CardTitle>
              <CardDescription>
                Recent earnings activity over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                {earningsInfo?.statistics.earning_serials && earningsInfo.statistics.earning_serials.length > 0 ? (
                  <div className="space-y-4">
                    {/* Simple Bar Chart using CSS */}
                    <div className="flex items-end justify-between h-32 border-b border-gray-200">
                      {earningsInfo.statistics.earning_serials.slice(-30).map((value, index) => {
                        const maxValue = Math.max(...earningsInfo.statistics.earning_serials.slice(-30));
                        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                        return (
                          <div
                            key={index}
                            className="flex flex-col items-center group relative"
                            style={{ width: `${100 / 30}%` }}
                          >
                            <div
                              className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-t-sm min-h-[2px]"
                              style={{ height: `${height}%`, width: '80%' }}
                            />
                            <div className="absolute -top-8 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {value.toFixed(4)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {earningsInfo.statistics.earning_serials.slice(-7).reduce((a, b) => a + b, 0).toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">Last 7 days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {earningsInfo.statistics.earning_serials.slice(-30).reduce((a, b) => a + b, 0).toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">Last 30 days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {(earningsInfo.statistics.earning_serials.slice(-30).reduce((a, b) => a + b, 0) / 30).toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">Daily average</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mr-2" />
                    <span>No earnings data available</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task History</CardTitle>
              <CardDescription>
                Recent task execution history and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taskHistory && taskHistory.tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskHistory.tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTaskStatusIcon(task.status)}
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{task.model || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {task.source}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(task.created_at)}</TableCell>
                        <TableCell>{formatDuration(task.total_duration)}</TableCell>
                        <TableCell>
                          {task.earnings ? `${task.earnings.toFixed(4)}` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No task history available</p>
                  <p className="text-sm">Tasks will appear here once they start running</p>
                </div>
              )}

              {/* Pagination for Task History */}
              {taskHistory && taskHistory.total > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, taskHistory.total)} of {taskHistory.total} tasks
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentPage > 1) {
                          const newPage = currentPage - 1;
                          setCurrentPage(newPage);
                          fetchTaskHistory(newPage);
                        }
                      }}
                      disabled={currentPage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {Math.ceil(taskHistory.total / 10)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentPage < Math.ceil(taskHistory.total / 10)) {
                          const newPage = currentPage + 1;
                          setCurrentPage(newPage);
                          fetchTaskHistory(newPage);
                        }
                      }}
                      disabled={currentPage >= Math.ceil(taskHistory.total / 10) || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
