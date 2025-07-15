/**
 * 收益统计组件
 * 显示任务完成数、今日收益、总收益
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';

interface EarningsStatsProps {
  taskCompleted: number;
  todayEarnings: number;
  totalEarnings: number;
}

export const EarningsStats: React.FC<EarningsStatsProps> = ({
  taskCompleted,
  todayEarnings,
  totalEarnings
}) => {

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <CardContent className="p-0 space-y-6">
        <h2 className="text-xl font-medium text-black">Earnings Statistics</h2>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Task Completed */}
          <div className="bg-white rounded-2xl flex items-center justify-center shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl font-normal text-gray-600 mb-2">
                {taskCompleted.toLocaleString()}
              </div>
              <div className="text-sm font-normal text-gray-600">
                Task Completed
              </div>
            </div>
          </div>

          {/* Today Earnings */}
          <div className="bg-white rounded-2xl flex items-center justify-center shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl font-normal text-gray-600 mb-2">
                $ {todayEarnings.toFixed(2)}
              </div>
              <div className="text-sm font-normal text-gray-600">
                Today Earnings
              </div>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="bg-white rounded-2xl flex items-center justify-center shadow-sm border p-6">
            <div className="text-center">
              <div className="text-3xl font-normal text-gray-600 mb-2">
                $ {totalEarnings.toFixed(2)}
              </div>
              <div className="text-sm font-normal text-gray-600">
                Total Earnings
              </div>
            </div>
          </div>
        </div>

        {/* 收益趋势指示器 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Earnings Efficiency</span>
            <span className="text-sm font-medium text-green-600">
              {taskCompleted > 0 ? ((todayEarnings / Math.max(taskCompleted, 1)) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((todayEarnings / Math.max(totalEarnings, 1)) * 100, 100)}%` 
              }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Today's contribution to total earnings
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
