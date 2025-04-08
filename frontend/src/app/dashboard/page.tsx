'use client'

import { Card } from '@nextui-org/react'
import { Button } from '@nextui-org/button'
import Echarts from '@/components/Echarts'
import Image from 'next/image'
import { EarningsCard } from '@/components/dashboard/EarningsCard'
import { DeviceCard } from '@/components/dashboard/DeviceCard'
import { UptimeCard } from '@/components/dashboard/UptimeCard'
import { Header } from '@/components/Header'
import { MainContent } from '@/components/MainContent'
import { useDashboard } from '@/hooks/useDashboard'
import { useThemeCus } from '@/hooks/useTheme'
import { useState, useCallback } from 'react'

export default function DashboardPage() {
    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')
    const [filter, setFilter] = useState<{ year?: string; month?: string; view?: 'Month' | 'Year' }>({
        year: '2025',
        month: 'Mar',
        view: 'Year'
    })
    const { summary, loading, error, refreshStatistics } = useDashboard(timeRange, filter)
    const { isDark } = useThemeCus()

    const handleTimeRangeChange = (range: 'daily' | 'weekly' | 'monthly') => {
        setTimeRange(range)
    }

    const handleFilterChange = useCallback((newFilter: { year?: string; month?: string; view?: 'Month' | 'Year' }) => {
        setFilter(prevFilter => {
            if (JSON.stringify(prevFilter) === JSON.stringify(newFilter)) {
                return prevFilter
            }
            return newFilter
        })
    }, [])

    return (
        <MainContent>
            <main className="flex-1 p-8 space-y-8 bg-white" style={{
                backgroundColor: isDark ? '#000' : "#fff"
            }}>
                <Header></Header>
                <div style={{
                    fontWeight: 800,
                    fontSize: '2.5em',
                    color: isDark ? '#fff' : '#000',
                    marginTop: 0
                }}>Dashboard</div>
                <div className="flex justify-between items-start">
                    <div className="flex-1 flex">
                        <EarningsCard summary={summary} loading={loading} error={error} />
                        <DeviceCard 
                            summary={summary} 
                            loading={loading} 
                            error={error} 
                            onFilterChange={handleFilterChange}
                        />
                    </div>
                </div>
                {/* <UptimeCard  summary={summary}  loading={loading} error={error}/> */}
                <h2 className="text-xl font-medium" style={{
                    color: isDark ? '#fff' : '#000'
                }}>Total AI Requests Processed</h2>
                <Card className='rounded-lg' style={{
                    backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
                    borderRadius: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div className="p-6">
                        <div className="flex items-center justify-end mb-6">
                            <div className="flex gap-4">
                                <span 
                                    onClick={() => handleTimeRangeChange('daily')}
                                    style={{
                                        color: timeRange === 'daily' ? (isDark ? '#fff' : '#000') : (isDark ? '#999' : '#666'),
                                        fontSize: '0.875rem',
                                        padding: '0 0.5rem',
                                        backgroundColor: timeRange === 'daily' ? (isDark ? '#333' : '#eee') : 'transparent',
                                        borderRadius: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >daily</span>
                                <span 
                                    onClick={() => handleTimeRangeChange('weekly')}
                                    style={{
                                        color: timeRange === 'weekly' ? (isDark ? '#fff' : '#000') : (isDark ? '#999' : '#666'),
                                        fontSize: '0.875rem',
                                        padding: '0 0.5rem',
                                        backgroundColor: timeRange === 'weekly' ? (isDark ? '#333' : '#eee') : 'transparent',
                                        borderRadius: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >weekly</span>
                                <span 
                                    onClick={() => handleTimeRangeChange('monthly')}
                                    style={{
                                        color: timeRange === 'monthly' ? (isDark ? '#fff' : '#000') : (isDark ? '#999' : '#666'),
                                        fontSize: '0.875rem',
                                        padding: '0 0.5rem',
                                        backgroundColor: timeRange === 'monthly' ? (isDark ? '#333' : '#eee') : 'transparent',
                                        borderRadius: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >monthly</span>
                            </div>
                        </div>
                        <div style={{
                            height: '280px'
                        }}>
                            <Echarts summary={summary} type='requests' timeRange={timeRange} />
                        </div>
                    </div>
                </Card>
                <h2 className="text-xl font-medium" style={{
                    color: isDark ? '#fff' : '#000'
                }}>Earning Statistics</h2>
                <Card className='rounded-lg' style={{
                    backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
                    borderRadius: '1rem'
                }}>
                    <div className="p-6">
                        <div style={{
                            height: '280px'
                        }}>
                            <Echarts summary={summary} type='earnings' timeRange={timeRange} />
                        </div>
                    </div>
                </Card>
            </main>
        </MainContent>
    )
}