/**
 * Earnings 页面组件
 * 
 * 根据 Figma 设计实现的收益管理页面
 * 包含当前余额、提取收益和收益历史功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, Clock } from 'lucide-react';
import { createApiClient, handleApiError } from '../utils/api-client';

interface EarningsData {
  totalEarnings: number;
  availableToClaim: number;
  pending: number;
  walletAddress: string;
  network: string;
  estimatedGasFee: string;
}

interface EarningsHistoryItem {
  id: string;
  date: string;
  taskType: string;
  model: string;
  duration: string;
  amount: number;
  status: 'paid' | 'pending';
}

interface EarningsProps {
  backendStatus?: {
    isRunning: boolean;
    port: number;
  };
}

export const Earnings: React.FC<EarningsProps> = ({ backendStatus }) => {
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    availableToClaim: 0,
    pending: 0,
    walletAddress: '',
    network: '',
    estimatedGasFee: '0.000 ETH'
  });

  const [earningsHistory, setEarningsHistory] = useState<EarningsHistoryItem[]>([
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🆕 使用新 API 获取收益数据
  const fetchEarningsData = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    setError(null);
    try {
      const apiClient = createApiClient(backendStatus);

      // 获取仪表板统计数据（包含收益信息）
      const statsResponse = await apiClient.getDashboardStatistics();
      if (statsResponse.success && statsResponse.data) {
        const stats = statsResponse.data as any;
        setEarningsData(prev => ({
          ...prev,
          totalEarnings: stats.cumulativeEarnings?.totalEarnings || stats.earningsStats?.totalEarnings || prev.totalEarnings,
          availableToClaim: stats.todayEarnings?.totalEarnings || stats.earningsStats?.todayEarnings || prev.availableToClaim,
          pending: (stats.cumulativeEarnings?.totalEarnings || 0) - (stats.todayEarnings?.totalEarnings || 0)
        }));
      }

      // 获取详细收益数据
      const earningsResponse = await apiClient.getEarnings('all');
      if (earningsResponse.success && earningsResponse.data) {
        const earnings = earningsResponse.data as any;
        console.log('Earnings API response:', earnings); // 调试日志
        setEarningsData(prev => ({
          ...prev,
          totalEarnings: earnings.totalEarnings || earnings.total || prev.totalEarnings,
          availableToClaim: earnings.totalEarnings || earnings.total || prev.availableToClaim
        }));

        // 处理 dailyBreakdown 数组（如果存在）
        if (earnings.dailyBreakdown && Array.isArray(earnings.dailyBreakdown)) {
          const historyItems = earnings.dailyBreakdown.map((item: any, index: number) => ({
            id: `${index + 1}`,
            date: item.date || new Date().toISOString().split('T')[0],
            taskType: 'AI Inference',
            model: 'Various Models',
            duration: `${item.taskCount || item.count || 1} tasks`,
            amount: item.amount || item.earnings || 0,
            status: 'paid' as const
          }));
          setEarningsHistory(historyItems);
        } else if (earnings.totalEarnings > 0) {
          // 如果没有详细历史，创建一个简单的记录
          const historyItems = [{
            id: '1',
            date: new Date().toISOString().split('T')[0],
            taskType: 'AI Inference',
            model: 'Various Models',
            duration: `${earnings.count || 1} tasks`,
            amount: earnings.totalEarnings,
            status: 'paid' as const
          }];
          setEarningsHistory(historyItems);
        }
      }

      // 获取任务历史作为收益历史的补充
      const taskHistoryResponse: any = await apiClient.getTaskHistory(1, 10);
      if (taskHistoryResponse.tasks) {
        if (taskHistoryResponse.tasks && Array.isArray(taskHistoryResponse.tasks) && taskHistoryResponse.tasks.length > 0) {
          const historyItems = taskHistoryResponse.tasks.map((task: any) => ({
            id: task.id || `task-${Date.now()}-${Math.random()}`,
            date: task.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            taskType: task.type || 'AI Inference',
            model: task.model || 'Various Models',
            duration: task.total_duration ? `${Math.round(task.total_duration / 1000)}s` : 'N/A',
            amount: task.total_duration - task.eval_duration || 0,
            status: task.status === 'completed' ? 'paid' as const : 'pending' as const
          }));

          setEarningsHistory(prev => {
            // 如果之前没有历史记录，直接使用任务历史
            if (prev.length === 0) {
              return historyItems.slice(0, 10);
            }

            // 合并现有历史和任务历史，去重
            const combined = [...prev, ...historyItems];
            const unique = combined.filter((item, index, self) =>
              index === self.findIndex(t => t.id === item.id)
            );
            return unique.slice(0, 10); // 只保留最近10条
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
      setError(handleApiError(error));

      // 设置默认的空数据，避免组件崩溃
      setEarningsData(prev => ({
        ...prev,
        totalEarnings: 0,
        availableToClaim: 0,
        pending: 0
      }));
      setEarningsHistory([]);
    }
  }, [backendStatus]);

  // 提取收益
  const handleClaimEarnings = useCallback(async () => {
    if (!backendStatus?.isRunning || earningsData.availableToClaim === 0) return;

    setIsLoading(true);
    setError(null); // 清除之前的错误
    try {
      console.log('Claiming earnings:', earningsData.availableToClaim);

      // 调用后端 API 进行提取
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/earnings/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: earningsData.availableToClaim,
          walletAddress: earningsData.walletAddress,
          network: earningsData.network
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 更新数据
          setEarningsData(prev => ({
            ...prev,
            availableToClaim: 0,
            pending: prev.pending + prev.availableToClaim
          }));

          // 刷新收益历史
          await fetchEarningsData();

          console.log('Earnings claimed successfully:', result.message);
        } else {
          throw new Error(result.error || 'Failed to claim earnings');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to claim earnings:', error);
      setError('Failed to claim earnings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [earningsData.availableToClaim, earningsData.walletAddress, earningsData.network, backendStatus, fetchEarningsData]);

  useEffect(() => {
    fetchEarningsData();

    // 定期刷新收益数据（每60秒）
    const interval = setInterval(fetchEarningsData, 60000);

    return () => clearInterval(interval);
  }, [fetchEarningsData]);

  return (
    <div className="min-h-screen bg-white">
              <Card className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}
        
        {/* Current Balance Section */}
        <div className="space-y-5">
          <h1 className="text-2xl font-medium text-black tracking-tight">Current Balance</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Total Earnings */}
            <Card className="bg-gradient-to-r from-white/40 to-white/4 border border-gray-200/50 rounded-2xl shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="space-y-2">
                  <div className="text-4xl font-mono font-normal text-gray-700 tracking-wider"  style={{ fontFamily: 'Aldrich, monospace' }}>
                    $ {earningsData.totalEarnings.toFixed(1)}
                  </div>
                  <div className="text-lg text-gray-700 tracking-wider">
                    Total Earnings
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available to Claim */}
            <Card className="bg-gradient-to-r from-white/40 to-white/4 border border-gray-200/50 rounded-2xl shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="space-y-2">
                  <div className="text-4xl font-mono font-normal text-gray-700 tracking-wider"  style={{ fontFamily: 'Aldrich, monospace' }}>
                    $ {earningsData.availableToClaim.toFixed(1)}
                  </div>
                  <div className="text-lg text-gray-700 tracking-wider">
                    Available to claim
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending */}
            <Card className="bg-gradient-to-r from-white/40 to-white/4 border border-gray-200/50 rounded-2xl shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="space-y-2">
                  <div className="text-4xl font-mono font-normal text-gray-700 tracking-wider"  style={{ fontFamily: 'Aldrich, monospace' }}>
                    $ {earningsData.pending.toFixed(1)}
                  </div>
                  <div className="text-lg text-gray-700 tracking-wider">
                    Pending
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Claim Earnings Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-medium text-black tracking-tight">Claim Earnings</h2>
            <Button 
              onClick={handleClaimEarnings}
              disabled={isLoading || earningsData.availableToClaim === 0}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-6 py-3 rounded-lg"
            >
              {isLoading ? 'Processing...' : `Claim $ ${earningsData.availableToClaim.toFixed(1)}`}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 px-4 rounded-lg">
              <span className="text-lg text-gray-700 tracking-wider">Total Earnings</span>
              <span className="text-lg text-gray-800 tracking-wider">{earningsData.walletAddress}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 px-4 rounded-lg">
              <span className="text-lg text-gray-700 tracking-wider">Network</span>
              <span className="text-lg text-gray-800 tracking-wider">{earningsData.network}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 px-4 rounded-lg">
              <span className="text-lg text-gray-700 tracking-wider">Estimated Gas Fee</span>
              <span className="text-lg text-gray-800 tracking-wider">{earningsData.estimatedGasFee}</span>
            </div>
          </div>
        </div>

        {/* Earnings History Section */}
        <Card className="bg-white rounded-2xl shadow-lg border-0">
          <CardContent className="p-6">
            <h2 className="text-2xl font-medium text-black tracking-tight mb-4">Earnings History</h2>
            
            <div className="overflow-hidden rounded-lg border border-gray-100">
              {/* Table Header */}
              <div className="bg-gray-50 border-b border-gray-100">
                <div className="grid grid-cols-6 gap-4 px-3 py-4">
                  <div className="px-4 text-sm font-medium text-gray-700 tracking-wider">Date</div>
                  <div className="px-4 text-sm font-medium text-gray-700 tracking-wider">Task Type</div>
                  <div className="px-4 text-sm font-medium text-gray-700 tracking-wider">Model</div>
                  <div className="px-4 text-sm font-medium text-gray-700 tracking-wider">Duration</div>
                  <div className="px-4 text-sm font-medium text-black tracking-wider">Amount</div>
                  <div className="px-6 text-sm font-medium text-black tracking-wider">Status</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="bg-white">
                {earningsHistory.map((item) => (
                  <div key={item.id} className="grid grid-cols-6 gap-4 px-3 py-4 border-b border-gray-100 last:border-b-0">
                    <div className="px-4 text-sm text-gray-700">{item.date}</div>
                    <div className="px-4 text-sm text-gray-700">{item.taskType}</div>
                    <div className="px-4 text-sm text-gray-700">{item.model}</div>
                    <div className="px-4 text-sm text-gray-700">{item.duration}</div>
                    <div className="px-4 text-sm text-black">$ {item.amount.toFixed(2)}</div>
                    <div className="px-4">
                      {item.status === 'paid' ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1 px-3 py-1 rounded-full">
                          <CheckCircle size={16} />
                          Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex items-center gap-1 px-3 py-1 rounded-full">
                          <Clock size={16} />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </Card>
    </div>
  );
};
