'use client'

import { useThemeCus } from '@/hooks/useTheme';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { SummaryResponse } from '@/types/api';
import { useState, useEffect } from 'react';

export default function ({summary, type = 'earnings', timeRange}: {summary: SummaryResponse | null, type?: 'earnings' | 'requests', timeRange?: 'daily' | 'weekly' | 'monthly'}) {
  const { isDark } = useThemeCus()
  const statistics = summary?.statistics

  const formatDate = (date: Date, range: 'daily' | 'weekly' | 'monthly' = 'daily'): string => {
    if (range === 'daily') {
      return date.toLocaleString('en-US', { hour: 'numeric', hour12: true }); // "3 PM"
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }); // "Apr 29"
    }
  };

  const generateTimePoints = () => {
    const points = [];
    const now = new Date();
    let count: number;
    
    // Determine the number of points based on type and timeRange
    if (type === 'earnings') {
      count = 31; // Always show 31 days for earnings
    } else {
      count = timeRange === 'daily' ? 24 : timeRange === 'weekly' ? 8 : 31;
    }

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      if (type === 'earnings' || timeRange === 'monthly') {
        // For earnings or monthly view, always show days
        // Start from current date and go backwards
        date.setHours(0, 0, 0, 0); // Reset time to start of day
        date.setDate(date.getDate() - i);
      } else if (timeRange === 'daily') {
        // For daily view, show hours
        date.setHours(date.getHours() - i);
        date.setMinutes(0, 0, 0); // Reset minutes, seconds, and milliseconds
      } else if (timeRange === 'weekly') {
        // For weekly view, show days
        date.setHours(0, 0, 0, 0); // Reset time to start of day
        date.setDate(date.getDate() - i);
      }
      points.push(formatDate(date, type === 'earnings' ? 'monthly' : timeRange));
    }
    return points;
  };

  const getChartOption = (): EChartsOption => {
    let data: number[];
    if (type === 'earnings') {
      // For earnings, always use earning_serials (31 days)
      data = statistics?.earning_serials || Array(31).fill(0);
    } else {
      // For requests, use request_serials with appropriate length
      const length = timeRange === 'daily' ? 24 : timeRange === 'weekly' ? 8 : 31;
      data = statistics?.request_serials || Array(length).fill(0);
    }

    const maxValue = Math.max(...data.map(v => Number(v)));
    const interval = maxValue > 0 ? maxValue / 5 : 1;

    const timePoints = generateTimePoints();

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: (params: any) => {
          const value = params[0].value;
          const date = params[0].axisValue;
          return `${date}<br />${type === 'earnings' ? '$' : ''}${value}${type === 'requests' ? ' requests' : ''}`;
        }
      },
      grid: {
        top: '10%',
        left: '3%',
        right: '3%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timePoints,
        axisLabel: {
          color: isDark ? '#fff' : '#000',
          fontSize: 12,
          lineHeight: 16,
          formatter: (value: string) => value
        },
        axisLine: {
          lineStyle: {
            color: isDark ? '#333' : '#E5E7EB'
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 10,
        max: maxValue * 1.2,
        interval: interval,
        axisLabel: {
          show: true,
          color: isDark ? '#fff' : '#000',
          formatter: (value: number) => type === 'earnings' ? `$${value.toFixed(2)}` : value.toFixed(0)
        },
        axisLine: {
          show: false
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#333' : '#E5E7EB',
            type: 'dashed'
          }
        }
      },
      series: [{
        name: type === 'earnings' ? 'Earnings' : 'Requests',
        data: data.map(value => type === 'earnings' ? Number(value).toFixed(2) : Number(value).toFixed(0)),
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: isDark ? '#fff' : '#000',
          width: 2
        },
        itemStyle: {
          color: isDark ? '#fff' : '#000',
          borderWidth: 2,
          borderColor: isDark ? '#333' : '#fff'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
            }, {
              offset: 1,
              color: isDark ? 'rgba(255, 255, 255, 0)' : 'rgba(0, 0, 0, 0)'
            }]
          }
        }
      }]
    };
  };

  const [option, setOption] = useState<EChartsOption>(getChartOption());

  useEffect(() => {
    setOption(getChartOption());
  }, [isDark, type, timeRange, statistics]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactECharts 
        option={option}
        style={{ height: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}

