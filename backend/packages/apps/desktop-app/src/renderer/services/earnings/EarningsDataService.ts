/**
 * 收益数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责收益数据的管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供收益特定的接口
 */

import { ApiResponse, EarningsData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * 收益数据服务
 */
export class EarningsDataService extends BaseDataService<EarningsData> {
  async fetch(): Promise<ApiResponse<EarningsData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 并行获取收益统计、历史记录和配置信息
      const [
        todayEarningsResponse,
        weekEarningsResponse, 
        monthEarningsResponse,
        allEarningsResponse,
        historyResponse, 
        statsResponse
      ] = await Promise.allSettled([
        this.apiClient.getEarnings('today'),
        this.apiClient.getEarnings('week'),
        this.apiClient.getEarnings('month'),
        this.apiClient.getEarnings('all'),
        this.apiClient.getTaskHistory(1, 50),
        this.apiClient.getDashboardStatistics()
      ]);

      // 初始化收益数据 - 使用真实API数据
      let earningsData: EarningsData = {
        currentBalance: {
          totalEarnings: 0,
          availableToClaim: 0,
          pending: 0
        },
        claimInfo: {
          walletAddress: '0x1234...5678',
          network: 'Ethereum Mainnet',
          estimatedGasFee: '0.002 ETH',
          canClaim: false
        },
        earningsHistory: []
      };

      // 处理总收益数据
      if (this.isSuccessResponse(allEarningsResponse)) {
        const allEarnings = this.getResponseData(allEarningsResponse);
        earningsData.currentBalance.totalEarnings = this.safeGet(allEarnings, 'totalEarnings', 0);
        
        // 假设80%可提取，20%待处理
        earningsData.currentBalance.availableToClaim = earningsData.currentBalance.totalEarnings * 0.8;
        earningsData.currentBalance.pending = earningsData.currentBalance.totalEarnings * 0.2;
        
        // 如果有收益，允许提取
        earningsData.claimInfo.canClaim = earningsData.currentBalance.availableToClaim > 0;
      }

      // 处理统计数据作为补充
      if (this.isSuccessResponse(statsResponse)) {
        const stats = this.getResponseData(statsResponse);
        if (earningsData.currentBalance.totalEarnings === 0) { // 如果没有收益数据，则使用统计数据
          earningsData.currentBalance = {
            totalEarnings: this.safeGet(stats, 'cumulativeEarnings.totalEarnings', 0),
            availableToClaim: this.safeGet(stats, 'todayEarnings.totalEarnings', 0),
            pending: this.safeGet(stats, 'pendingEarnings', 0)
          };
        }
      }

      // 钱包配置使用默认值，实际应该从设备注册信息中获取

      // 处理历史记录
      if (this.isSuccessResponse(historyResponse)) {
        const history = this.getResponseData(historyResponse);
        if (Array.isArray(history.tasks) && history.tasks.length > 0) {
          earningsData.earningsHistory = history.tasks.map((task: any, index: number) => ({
            id: task.id || `tx-${index + 1}`,
            date: task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            taskType: this.getTaskTypeDisplay(task.type || 'unknown'),
            model: task.model || 'llama2-7b',
            duration: this.formatDuration(task.duration || 0),
            amount: this.calculateTaskEarnings(task),
            status: this.mapTaskStatusToEarningStatus(task.status || 'unknown')
          }));
        }
      }

      return this.createSuccessResponse(earningsData);
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch earnings data'
      );
    }
  }

  /**
   * 提取收益
   */
  async claimEarnings(): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有提取收益的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.claimEarnings() 的方法
      return {
        success: true,
        data: {
          message: 'Earnings claim initiated',
          transactionId: `tx-${Date.now()}`,
          amount: 0,
          estimatedTime: '5-10 minutes'
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to claim earnings'
      );
    }
  }

  /**
   * 获取任务类型显示名称
   */
  private getTaskTypeDisplay(type: string): string {
    const typeMap: Record<string, string> = {
      'chat': 'Chat Completion',
      'generate': 'Text Generation',
      'embeddings': 'Embeddings',
      'completion': 'Text Completion',
      'unknown': 'Text Generation'
    };
    return typeMap[type] || 'Text Generation';
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * 计算任务收益
   */
  private calculateTaskEarnings(task: any): number {
    // 简化的收益计算，实际应该基于token使用量和费率
    const baseReward = 0.01;
    const inputTokens = this.safeGet(task, 'inputTokens', 100);
    const outputTokens = this.safeGet(task, 'outputTokens', 50);
    
    return Number((baseReward + (inputTokens + outputTokens) * 0.0001).toFixed(4));
  }

  /**
   * 映射任务状态到收益状态
   */
  private mapTaskStatusToEarningStatus(status: string): 'paid' | 'pending' | 'failed' {
    const statusMap: Record<string, 'paid' | 'pending' | 'failed'> = {
      'completed': 'paid',
      'success': 'paid',
      'running': 'pending',
      'pending': 'pending',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'failed'
    };
    return statusMap[status] || 'pending';
  }
}
