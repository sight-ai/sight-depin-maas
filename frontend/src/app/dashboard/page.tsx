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

export default function DashboardPage() {
    const { summary, loading, error, refreshStatistics } = useDashboard()
    const { isDark } = useThemeCus()

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
                        <DeviceCard summary={summary} loading={loading} error={error} />
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
                                <span style={{
                                    color: isDark ? '#999' : '#666',
                                    fontSize: '0.875rem'
                                }}>daily</span>
                                <span style={{
                                    color: isDark ? '#999' : '#666',
                                    fontSize: '0.875rem'
                                }}>weekly</span>
                                <span style={{
                                    color: isDark ? '#fff' : '#000',
                                    fontSize: '0.875rem',
                                    padding: '0 0.5rem',
                                    backgroundColor: isDark ? '#333' : '#eee',
                                    borderRadius: '1rem'
                                }}>monthly</span>
                            </div>
                        </div>
                        <div style={{
                            height: '280px'
                        }}>
                            <Echarts summary={summary}></Echarts>
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
                        <div className="flex items-center justify-between mb-6">

                            {/* <div className="flex gap-4">
                                <span style={{
                                    color: isDark ? '#999' : '#666',
                                    fontSize: '0.875rem'
                                }}>daily</span>
                                <span style={{
                                    color: isDark ? '#999' : '#666',
                                    fontSize: '0.875rem'
                                }}>weekly</span>
                                <span style={{
                                    color: isDark ? '#fff' : '#000',
                                    fontSize: '0.875rem',
                                    padding: '0 0.5rem',
                                    backgroundColor: isDark ? '#333' : '#eee',
                                    borderRadius: '1rem'
                                }}>monthly</span>
                            </div> */}
                        </div>
                        <div style={{
                            height: '280px'
                        }}>
                            <Echarts summary={summary}></Echarts>
                        </div>
                    </div>
                </Card>
            </main>
        </MainContent>
    )
}