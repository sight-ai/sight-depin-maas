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
            month: view === 'Month' ? selectedMonth : undefined,
            view
        })
    }, [selectedYear, selectedMonth, view, onFilterChange])

    // 根据筛选条件过滤 task_activity 数据
    const filteredTaskActivity = useMemo(() => {
        if (!summary?.statistics?.task_activity) return [];
        
        const taskActivity = summary.statistics.task_activity;
        
        // Data should already be filtered on the backend
        return taskActivity;
    }, [summary?.statistics?.task_activity]);

    // 生成可选的年份列表，从当前年份开始往前推5年
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array(5).fill(0).map((_, index) => {
            const year = (currentYear - index).toString();
            return { value: year, label: year };
        });
    }, []);

    // Helper function to get the appropriate number of days based on month and year
    const getDaysInMonth = (year: number, month: number): number => {
        return new Date(year, month, 0).getDate();
    };

    // Calculate number of days to display in Month view
    const daysInSelectedMonth = useMemo(() => {
        if (view !== 'Month') return 31;
        const monthIndex = months.indexOf(selectedMonth) + 1;
        return getDaysInMonth(parseInt(selectedYear), monthIndex);
    }, [selectedYear, selectedMonth, view]);

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
                            options={yearOptions}
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

                    {/* 年份选择网格 */}
                    {view === 'Year' && <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.25rem',
                        marginBottom: '0.5rem'
                    }}>
                        {yearOptions.map((yearOption) => (
                            <div
                                key={yearOption.value}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    backgroundColor: yearOption.value === selectedYear ? (isDark ? '#fff' : '#000') : 'transparent',
                                    color: yearOption.value === selectedYear ? (isDark ? '#000' : '#fff') : (isDark ? '#fff' : '#000'),
                                    fontSize: '12px',
                                    textAlign: 'center'
                                }}
                                onClick={() => setSelectedYear(yearOption.value)}
                            >
                                {yearOption.value}
                            </div>
                        ))}
                    </div>}
                    
                    {/* Only show months grid when view is 'Month' */}
                    {view === 'Month' && (
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
                                        backgroundColor: month === selectedMonth ? (isDark ? '#fff' : '#000') : 'transparent',
                                        color: month === selectedMonth ? (isDark ? '#000' : '#fff') : (isDark ? '#fff' : '#000'),
                                        fontSize: '12px',
                                        textAlign: 'center'
                                    }}
                                    onClick={() => setSelectedMonth(month)}
                                >
                                    {month}
                                </div>
                            ))}
                        </div>
                    )}
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
                    gridTemplateColumns: view === 'Year' ? 'repeat(12, 1fr)' : `repeat(${daysInSelectedMonth}, 1fr)`,
                    gap: '0.5rem',
                    padding: '0.5rem',
                    flex: 1
                }}>
                    {view === 'Year' ? (
                        // Year view: 12 blocks for months
                        Array(12).fill(null).map((_, index) => {
                            // Use data from backend - it should already have 12 months worth of data
                            const monthData = filteredTaskActivity[index] || 0;
                            return (
                                <div
                                    key={index}
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        backgroundColor: getColorForActivity(monthData, isDark),
                                        borderRadius: '2px'
                                    }}
                                    title={`${months[index]}: ${monthData} tasks`}
                                />
                            );
                        })
                    ) : (
                        // Month view: dynamic number of days based on selected month
                        Array(daysInSelectedMonth).fill(null).map((_, index) => {
                            // Use data from backend - should have data for the days in the selected month
                            const dayData = filteredTaskActivity[index] || 0;
                            return (
                                <div
                                    key={index}
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        backgroundColor: getColorForActivity(dayData, isDark),
                                        borderRadius: '2px'
                                    }}
                                    title={`Day ${index + 1}: ${dayData} tasks`}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </Card>
        </div>
    )
}

// Helper function to determine color based on activity level
function getColorForActivity(count: number, isDark: boolean) {
    if (count === 0) return isDark ? '#333' : '#E5E7EB';
    if (count < 5) return '#c0befe';
    if (count < 10) return '#807cfc';
    return '#0800ff';
}