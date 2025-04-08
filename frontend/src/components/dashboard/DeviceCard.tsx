'use client'

import { Card, Select } from 'antd'
import { Calendar } from 'antd'
import type { CalendarMode } from 'antd/es/calendar/generateCalendar'
import type { Dayjs } from 'dayjs'
import { useThemeCus } from '@/hooks/useTheme'
import { SummaryResponse } from '@/types/api'
import { useDevice } from '@/hooks/useDeviceStatus'
import dayjs from 'dayjs'
import { useState, useMemo, useEffect } from 'react'

const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export function DeviceCard({
    summary,
    loading,
    error,
    onFilterChange
}: {
    summary: SummaryResponse | null;
    loading: boolean;
    error: string | null;
    onFilterChange: (filter: { year?: string; month?: string; view?: 'Month' | 'Year' }) => void;
}) {
    const { isDark } = useThemeCus()
    const [selectedYear, setSelectedYear] = useState('2025')
    const [selectedMonth, setSelectedMonth] = useState('Mar')
    const [view, setView] = useState<'Month' | 'Year'>('Year')

    const deviceInfo = summary?.device_info
    const {
        data
    } = useDevice()

    // 处理筛选条件变化
    useEffect(() => {
        onFilterChange({
            year: selectedYear,
            month: selectedMonth,
            view
        })
    }, [selectedYear, selectedMonth, view, onFilterChange])

    // 根据筛选条件过滤 task_activity 数据
    const filteredTaskActivity = useMemo(() => {
        if (!summary?.statistics?.task_activity) return [];
        
        const taskActivity = summary.statistics.task_activity;
        const now = new Date();
        const selectedDate = new Date(parseInt(selectedYear), months.indexOf(selectedMonth), 1);
        
        if (view === 'Year') {
            // 年度视图：显示所有月份的数据
            return taskActivity;
        } else {
            // 月度视图：只显示选中月份的数据
            const startDate = new Date(selectedDate);
            const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            
            return taskActivity.filter((_, index) => {
                const date = new Date();
                date.setDate(date.getDate() - (29 - index));
                return date >= startDate && date <= endDate;
            });
        }
    }, [summary?.statistics?.task_activity, selectedYear, selectedMonth, view]);

    const onPanelChange = (value: Dayjs, mode: CalendarMode) => {
        console.log(value.format('YYYY-MM-DD'), mode);
    };

    // 自定义日期单元格的渲染
    const dateCellRender = (value: Dayjs) => {
        // 这里可以根据日期返回不同的样式
        // 示例：随机返回不同的背景色
        const styles = {
            width: '24px',
            height: '24px',
            margin: '4px',
            backgroundColor: Math.random() > 0.7 ? '#000' : Math.random() > 0.5 ? '#666' : '#eee',
            borderRadius: '4px',
        };
        return <div style={styles}></div>;
    };

    // 模拟数据
    const gridData = Array(31).fill(null).map((_, i) => ({
        id: i,
        status: Math.random() > 0.8 ? 'active' : Math.random() > 0.5 ? 'partial' : 'inactive'
    }));

    return (
        <div className='flex-1'>
            <h2 className="text-2xl  mb-3 text-black ml-10" style={{
            color: isDark ? '#fff' : '#000'
        }}>Uptime</h2>
        <Card
            className='ml-10'
            style={{
                backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
                borderRadius: '1rem',
                border: 'none',
                flex: 1,
            }}
            bodyStyle={{ padding: '1.5rem' }}
        >
            
            <div style={{ 
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
            }}>
                {/* 左侧月份列表 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    minWidth: '120px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                    }}>
                        <Select
                            value={selectedYear}
                            onChange={setSelectedYear}
                            style={{ width: 80 }}
                            options={[
                                { value: '2025', label: '2025' },
                                { value: '2024', label: '2024' },
                            ]}
                            bordered={false}
                            dropdownStyle={{ backgroundColor: isDark ? '#1a1a1a' : '#fff', color: isDark ? '#fff' : '#000' }}
                        />
                        <div style={{
                            display: 'flex',
                            gap: '0.25rem',
                            marginLeft: 'auto'
                        }}>
                            {['Month', 'Year'].map(item => (
                                <div
                                    key={item}
                                    style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        backgroundColor: view === item ? (isDark ? '#fff' : '#000') : 'transparent',
                                        color: view === item ? (isDark ? '#000' : '#fff') : (isDark ? '#fff' : '#000'),
                                        fontSize: '12px'
                                    }}
                                    onClick={() => setView(item as 'Month' | 'Year')}
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.25rem'
                    }}>
                        {months.map((month, index) => (
                            <div
                                key={month}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    backgroundColor: month === selectedMonth ? '#000' : 'transparent',
                                    color: month === selectedMonth ? '#fff' : (isDark ? '#fff' : '#000'),
                                    fontSize: '12px',
                                    textAlign: 'center'
                                }}
                                onClick={() => setSelectedMonth(month)}
                            >
                                {month}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 分隔线 */}
                <div style={{
                    width: '1px',
                    alignSelf: 'stretch',
                    backgroundColor: isDark ? '#333' : '#e5e5e5',
                    margin: '0 1rem'
                }} />

                {/* 右侧网格 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: view === 'Year' ? 'repeat(12, 1fr)' : 'repeat(31, 1fr)',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    flex: 1
                }}>
                    {filteredTaskActivity.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                width: '30px',
                                height: '30px',
                                backgroundColor: 
                                    item === 0 ? '#E5E7EB' : 
                                    item >= 10 ? '#0800ff' : '#807cfc',
                                borderRadius: '2px'
                            }}
                        />
                    ))}
                </div>
            </div>
        </Card>
        </div>
    )
}