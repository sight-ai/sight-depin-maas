'use client'

import { useThemeCus } from '@/hooks/useTheme'
import { Card } from '@nextui-org/react'
import { useEffect, useState } from 'react'
import { apiService } from '@/services/api'
import { SummaryResponse } from '@/types/api'

export function EarningsCard() {
    let { isDark } = useThemeCus()
    const [summary, setSummary] = useState<SummaryResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await apiService.getSummary()
                setSummary(data)
            } catch (err) {
                console.error('Failed to fetch summary:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchSummary()
    }, [])

    if (loading) {
        return (
            <Card className="p-8 bg-white flex-1" style={{
                backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
                borderRadius: '2rem'
            }}>
                <div>loading...</div>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="p-8 bg-white flex-1" style={{
                backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
                borderRadius: '2rem'
            }}>
                <div className="text-red-500">{error}</div>
            </Card>
        )
    }

    return (
        <Card className="p-8 bg-white flex-1" style={{
            backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
            borderRadius: '2rem'
        }}>
            <h2 className="text-2xl font-semibold mb-3 text-black" style={{
                color: isDark ? '#fff' : '#000'
            }}>Earnings</h2>
            <div className="flex gap-10 mt-5">
                <div className='flex items-center flex-1' style={{ backgroundColor: isDark ? '#000' : '#fff', padding: 15, borderRadius: 13 }}>
                    <div className="text-base text-black mb-1 mr-6" style={{
                        color: isDark ? '#fff' : '#000',
                    }}>LIFETIME <div>BLOCK REWARDS</div></div>
                    <div className="text-4xl font-bold text-black" style={{
                        color: isDark ? '#fff' : '#000',
                        fontFamily: 'Aldrich',
                    }}>$ {summary?.earning_info.total_block_rewards || 0}</div>
                </div>
                <div className='flex items-center flex-1' style={{ backgroundColor: isDark ? '#000' : '#fff', padding: 15, borderRadius: 13 }}>
                    <div className="text-base text-black mb-1 mr-6" style={{
                        color: isDark ? '#fff' : '#000',
                    }}>JOB EARNINGS</div>
                    <div className="text-4xl font-bold text-black" style={{
                        color: isDark ? '#fff' : '#000',
                        fontFamily: 'Aldrich'
                    }}>$ {summary?.earning_info.total_job_rewards || 0}</div>
                </div>
            </div>
        </Card>
    )
}