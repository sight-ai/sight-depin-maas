import { useThemeCus } from '@/hooks/useTheme';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useDashboard } from '@/hooks/useDashboard';
import { SummaryResponse } from '@/types/api';

export default function ({summary, loading,
  error,}: {summary: SummaryResponse | null, loading: boolean, error: string | null}) {
  let { isDark } = useThemeCus()
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
      data: Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return `${date.getDate()}\n${date.toLocaleString('default', { month: 'short' })}`;
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
    },
    {
        type: 'category',
        boundaryGap: false,
        data: statistics?.earning_serials.map(value => Number(value).toFixed(2))  || Array(30).fill(0),
        axisLabel: {
          color:  isDark ? '#fff' :'#000',
          fontSize: 12,
          lineHeight: 16
        },
        axisLine: {
          lineStyle: {
            color: '#E5E7EB'
          }
        }
      }
],
    yAxis: {
      type: 'value',
      min: 0,
      max: Math.max(...(statistics?.earning_serials || [0])) * 1.2,
      interval: Math.max(...(statistics?.earning_serials || [0])) * 0.2,
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
      data: statistics?.earning_serials ? statistics?.earning_serials.map(value => Number(value).toFixed(2)) :  Array(30).fill(0),
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        color:  isDark ? '#fff' :'#000',
        width: 2
      },
      itemStyle: {
        color: '#000',
        borderWidth: 2,
        borderColor: '#fff'
      },
      // areaStyle: null
    }]
  });

  return (
    <div style={{ width: '100%' }}>
      <ReactECharts option={getTopViewOption()} />
    </div>
  );
}

