import { useThemeCus } from '@/hooks/useTheme';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { SummaryResponse } from '@/types/api';

export default function ({summary, type = 'earnings', timeRange}: {summary: SummaryResponse | null, type?: 'earnings' | 'requests', timeRange?: 'daily' | 'weekly' | 'monthly'}) {
  const { isDark } = useThemeCus()
  const statistics = summary?.statistics

  const getTopViewOption = (): EChartsOption => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      }
    },
    grid: {
      top: 0,
      left: '2%',
      right: '2%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: [{
      type: 'category',
      boundaryGap: false,
      data: Array.from({length: type === 'requests' ? (timeRange === 'daily' ? 24 : timeRange === 'weekly' ? 7 : 30) : 30}, (_, i) => {
        const date = new Date();
        if (type === 'requests') {
          if (timeRange === 'daily') {
            date.setHours(date.getHours() - (23 - i));
            return `${date.getHours()}:00`;
          } else if (timeRange === 'weekly') {
            date.setDate(date.getDate() - (6 - i));
            return `${date.getDate()}\n${date.toLocaleString('default', { month: 'short' })}`;
          } else {
            date.setDate(date.getDate() - (29 - i));
            return `${date.getDate()}\n${date.toLocaleString('default', { month: 'short' })}`;
          }
        } else {
          date.setDate(date.getDate() - (29 - i));
          return `${date.getDate()}\n${date.toLocaleString('default', { month: 'short' })}`;
        }
      }),
      axisLabel: {
        color: isDark ? '#fff' :'#000',
        fontSize: 12,
        lineHeight: 16
      },
      axisLine: {
        lineStyle: {
          color: '#E5E7EB'
        }
      }
    }],
    yAxis: {
      type: 'value',
      min: 0,
      max: type === 'earnings' 
        ? Math.max(...(statistics?.earning_serials || [0])) * 1.2
        : Math.max(...(statistics?.request_serials || [0])) * 1.2,
      interval: type === 'earnings'
        ? Math.max(...(statistics?.earning_serials || [0])) * 0.2
        : Math.max(...(statistics?.request_serials || [0])) * 0.2,
      axisLabel: {
        show: false
      },
      axisLine: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#E5E7EB',
          type: 'dashed'
        }
      }
    },
    series: [{
      data: type === 'earnings'
        ? statistics?.earning_serials ? statistics.earning_serials.map(value => Number(value).toFixed(2)) : Array(30).fill(0)
        : statistics?.request_serials ? statistics.request_serials.map(value => Number(value).toFixed(0)) : Array(30).fill(0),
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        color: isDark ? '#fff' :'#000',
        width: 2
      },
      itemStyle: {
        color: '#000',
        borderWidth: 2,
        borderColor: '#fff'
      },
    }]
  });

  return (
    <div style={{ width: '100%' }}>
      <ReactECharts option={getTopViewOption()} />
    </div>
  );
}

