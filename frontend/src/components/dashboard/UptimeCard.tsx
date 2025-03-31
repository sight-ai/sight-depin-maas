'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { SummaryResponse } from '@/types/api'
import { useThemeCus } from "@/hooks/useTheme"

export function UptimeCard({ statistics, loading,
    error, }: { statistics: SummaryResponse | null, loading: boolean, error: string | null }) {
    const { isDark } = useThemeCus()
    return (
        <Card className="p-8 pb-0 flex-1">
            <CardTitle className="text-2xl font-semibold">Uptime</CardTitle>
            <CardContent>
                <div className="flex flex-col">
                    <div style={{ color: '#000' }} className='flex justify-end'>
                        <span className="text-base" style={{
                            color: isDark ? '#fff' : '#000',
                        }}>Last 30 days {statistics?.statistics?.up_time_percentage.toFixed(1)}% Uptime</span>
                    </div>
                    <div className='flex items-center justify-between mt-5'>
                        {
                            (statistics?.statistics?.task_activity || Array(30).fill(0)).map((item, index) => (
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
                </div>
            </CardContent>
        </Card>
    )
}