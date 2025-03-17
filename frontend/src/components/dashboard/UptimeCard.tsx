'use client'

import { useThemeCus } from '@/hooks/useTheme'
import { Card } from '@nextui-org/react'
import { SummaryResponse } from '@/types/api'

export function UptimeCard({summary, loading,
    error,}: {summary: SummaryResponse | null, loading: boolean, error: string | null}) {
    const { isDark } = useThemeCus()
    const statistics = summary?.statistics

    return (
        <Card className="p-5 bg-white flex-1" style={{
            backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
            borderRadius: '2rem'

        }}>
            {loading ? (
                <div>Loading...</div>
            ) : error ? (
                <div className="text-red-500">{error}</div>
            ) : (
                <>
                    <div style={{ color: '#000' }} className='flex justify-end'>
                        <span className="text-base" style={{
                            color: isDark ? '#fff' : '#000',
                        }}>Last 30 days {statistics?.up_time_percentage.toFixed(1)}% Uptime</span>
                    </div>
                    <div className='flex mt-7 items-center justify-around mb-5'>
                        {
                            statistics?.task_activity.map((item, index) => (
                                <div key={index} style={{
                                    width: '2rem',
                                    height: '2rem',
                                    backgroundColor: item === 0 ? '#E5E7EB' : item >= 10 ? '#0800ff' : '#807cfc',
                                    borderRadius: '0.3rem',
                                    marginRight: '0.4rem'
                                }}></div>
                            ))
                        }
                    </div>
                </>)}
        </Card>
    )
}