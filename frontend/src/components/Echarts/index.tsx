import { useThemeCus } from '@/hooks/useTheme';
import ReactECharts, { EChartsOption } from 'echarts-for-react';

export default function () {
  let { isDark } = useThemeCus()

  const getTopViewOption = (): EChartsOption => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      }
    },
    grid: {
    top: 0,
      left: '1%',
      right: '1%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: [{
      type: 'category',
      boundaryGap: false,
      data: ['8\nFeb', '9\nFeb', '10\nFeb', '11\nFeb', '12\nFeb', '13\nFeb', '14\nFeb', '15\nFeb', 
             '16\nFeb', '17\nFeb', '18\nFeb', '19\nFeb', '20\nFeb', '21\nFeb', '22\nFeb', '23\nFeb', 
             '24\nFeb', '25\nFeb', '26\nFeb', '27\nFeb', '28\nFeb', '1\nMar', '2\nMar', '3\nMar', '4\nMar'],
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
        data: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
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
      max: 0.0,
      interval: 0.0,
      axisLabel: {
        color: isDark ? '#fff' :'#000',
        fontSize: 12
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#E5E7EB'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#E5E7EB',
          type: 'dashed'
        }
      }
    },
    series: [{
      data: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
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

