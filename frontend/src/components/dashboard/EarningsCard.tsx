'use client'

import { SummaryResponse } from '@/types/api'
import { Loader2 } from 'lucide-react'
import { Card } from '../ui/card'
import { useThemeCus } from '@/hooks/useTheme'
export function EarningsCard({ summary, loading,
    error, }: { summary: SummaryResponse | null, loading: boolean, error: string | null }) {
    const { isDark } = useThemeCus()
    return (
        <Card className="p-8 pb-0 flex-1">
            <h2 className="text-2xl font-semibold mb-3 text-foreground">Earnings</h2>
            <div className="flex gap-10 mt-5">
                <div className='flex items-center flex-1 bg-card p-4 rounded-lg' style={{
                    backgroundColor: isDark ? '#000' : '#fff'
                }}>
                    <div className="text-base text-foreground mb-1 mr-6">
                        LIFETIME <div>BLOCK REWARDS</div>
                    </div>
                    {!loading ? <div className="text-4xl font-bold text-foreground" style={{
                        fontFamily: 'Aldrich',
                    }}>$ {(summary?.earning_info.total_block_rewards || 0).toFixed(2)}</div> : <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                </div>
                <div className='flex items-center flex-1 bg-card p-4 rounded-lg' style={{
                    backgroundColor: isDark ? '#000' : '#fff'
                }}>
                    <div className="text-base text-foreground mb-1 mr-6">
                        JOB EARNINGS
                    </div>
                    {!loading ? <div className="text-4xl font-bold text-foreground" style={{
                        fontFamily: 'Aldrich'
                    }}>$ {(summary?.earning_info.total_job_rewards || 0).toFixed(2)}</div> : <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                </div>
            </div>
        </Card>
    )
}