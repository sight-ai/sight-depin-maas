import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  DollarSign,
  Target,
  Cpu,
  Brain
} from 'lucide-react';

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface CyberTaskModuleProps {
  backendStatus: BackendStatus;
}

interface Task {
  id: string;
  name: string;
  type: 'inference' | 'training' | 'processing' | 'analysis';
  status: 'running' | 'completed' | 'failed' | 'pending';
  progress: number;
  reward: number;
  duration: string;
  startTime: Date;
  endTime?: Date;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalEarnings: number;
  avgCompletionTime: string;
  successRate: number;
}

interface HistoryTask {
  id: string;
  task_id: string;
  model_name: string;
  status: string;
  created_at: string;
  completed_at?: string;
  earnings: number;
  input_tokens?: number;
  output_tokens?: number;
  duration?: number;
}

interface ConnectTask {
  id: string;
  task_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  priority: number;
  metadata?: any;
}

interface MinerSummary {
  todayEarnings: number;
  totalEarnings: number;
  completedTasks: number;
  efficiency: number;
  status: string;
}

export const CyberTaskModule: React.FC<CyberTaskModuleProps> = ({ backendStatus }) => {
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [historicalTasks, setHistoricalTasks] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState<any>({
    total_block_rewards: 0,
    total_job_rewards: 0,
  });

  // Fetch real task history
  const fetchTaskHistory = async () => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/miner/history?page=1&limit=99`);
      if (response.ok) {
        const data = await response.json();
        if (data.tasks) {
          const historyTasks: any[] = data.tasks || [];

          // Convert to display format
          const displayTasks: Task[] = historyTasks.map(task => ({
            id: task.id,
            name: `${task.model} Task`,
            type: 'inference' as const,
            status: task.status === 'completed' ? 'completed' :
                   task.status === 'failed' ? 'failed' : 'pending',
            progress: task.status === 'completed' ? 100 : 0,
            reward: task.eval_duration || 0,
            duration: task.total_duration ? `${Math.round(task.total_duration / 1000)}s` : '0s',
            startTime: new Date(task.created_at),
            endTime: task.completed_at ? new Date(task.completed_at) : undefined
          }));
          setCurrentTasks(displayTasks.filter(task => task.status === 'running' || task.status === 'pending'));
          setHistoricalTasks(displayTasks.filter(task => task.status === 'completed' || task.status === 'failed'));
        }
      }
    } catch (error) {
      console.error('Failed to fetch task history:', error);
    }
  };

  // Fetch miner summary for stats
  const fetchMinerSummary = async () => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/miner/summary`);
      if (response.ok) {
        const data = await response.json();
        console.log('Miner summary response:', data); // Debug log

        // API返回的数据结构是 { earning_info: { total_block_rewards, total_job_rewards }, ... }
        const summary = data;
        setTaskStats({
          // totalTasks: summary.completedTasks || 0,
          // completedTasks: summary.completedTasks || 0,
          // failedTasks: 0, // Not available in API
          total_block_rewards: summary.earning_info?.total_block_rewards || 0,
          total_job_rewards: summary.earning_info?.total_job_rewards || 0,
          // avgCompletionTime: '2.5m', // Not available in API
          // successRate: summary.efficiency || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch miner summary:', error);
    }
  };

  // Real-time data updates
  useEffect(() => {
    if (!backendStatus.isRunning) return;

    // Initial fetch
    fetchTaskHistory();
    fetchMinerSummary();

    // Set up intervals for real-time updates
    const historyInterval = setInterval(fetchTaskHistory, 30000); // Every 30 seconds
    const summaryInterval = setInterval(fetchMinerSummary, 60000); // Every minute

    return () => {
      clearInterval(historyInterval);
      clearInterval(summaryInterval);
    };
  }, [backendStatus]);

  const getTaskTypeIcon = (type: Task['type']) => {
    switch (type) {
      case 'inference': return <Brain className="h-4 w-4" />;
      case 'training': return <Target className="h-4 w-4" />;
      case 'processing': return <Cpu className="h-4 w-4" />;
      case 'analysis': return <Activity className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getTaskTypeColor = (type: Task['type']) => {
    switch (type) {
      case 'inference': return 'text-cyan-400';
      case 'training': return 'text-magenta-400';
      case 'processing': return 'text-green-400';
      case 'analysis': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'running': return 'text-cyan-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'running': return <Play className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'failed': return <AlertCircle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Task Statistics Header */}
      <div className="cyber-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-magenta-500 rounded-lg flex items-center justify-center">
            <Activity className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">TASK CONTROL CENTER</h1>
            <p className="text-cyan-400/80 font-mono text-sm">Neural Task Management System</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
          <div className="cyber-metric-card text-center">
            <div className="cyber-metric-value mb-2">{taskStats.total_block_rewards}</div>
            <div className="cyber-metric-label">TOTAL BLOCK REWARDS</div>
          </div>
          <div className="cyber-metric-card text-center">
            <div className="cyber-metric-value mb-2">{taskStats.total_job_rewards}</div>
            <div className="cyber-metric-label">TOTAL JOB REWARDS</div>
          </div>
        </div>
      </div>

      {/* Task Tabs */}
      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-black/20 border border-cyan-500/20">
          <TabsTrigger value="current" className="font-mono data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            CURRENT TASKS
          </TabsTrigger>
          <TabsTrigger value="history" className="font-mono data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            TASK HISTORY
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {currentTasks.map((task) => (
              <div key={task.id} className="cyber-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`${getTaskTypeColor(task.type)}`}>
                      {getTaskTypeIcon(task.type)}
                    </div>
                    <div>
                      <div className="text-sm font-mono text-foreground">{task.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {task.startTime.toLocaleDateString()} | {task.duration}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-mono text-green-400">
                      {task.status === 'completed' ? `$${task.reward.toFixed(2)}` : '$0.00'}
                    </div>
                    <Badge className={`cyber-badge ${getStatusColor(task.status)}`}>
                      {task.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {historicalTasks.map((task) => (
              <div key={task.id} className="cyber-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`${getTaskTypeColor(task.type)}`}>
                      {getTaskTypeIcon(task.type)}
                    </div>
                    <div>
                      <div className="text-sm font-mono text-foreground">{task.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {task.startTime.toLocaleDateString()} | {task.duration}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-mono text-green-400">
                      {task.status === 'completed' ? `$${task.reward.toFixed(2)}` : '$0.00'}
                    </div>
                    <Badge className={`cyber-badge ${getStatusColor(task.status)}`}>
                      {task.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
