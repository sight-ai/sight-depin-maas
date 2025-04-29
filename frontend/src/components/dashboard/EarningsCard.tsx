'use client'

import { useThemeCus } from '@/hooks/useTheme'
import { Card } from '@nextui-org/react'
import { SummaryResponse } from '@/types/api'

export function EarningsCard({
    summary,
    loading,
    error,
}: {
    summary: SummaryResponse | null;
    loading: boolean;
    error: string | null;
}) {
    const { isDark } = useThemeCus()

    return (
        <div className='flex-1'>
            <h2 className="text-2xl mb-3" style={{
                color: isDark ? '#fff' : '#000'
            }}>Earnings</h2>
            <Card style={{
                borderRadius: '1.375rem',
                padding: '0.5rem'
            }}>
                <div className="flex gap-10">
                    <div className='flex items-center flex-1' style={{
                        background: `radial-gradient(circle at -30% 78%, #F7D046 17.5%, #E7337A 58.4%, #6D20F5 95%)`,
                        padding: '2rem',
                        borderRadius: '1.375rem',
                        minHeight: '120px',
                        position: 'relative',
                    }}>
                        {/* Add overlay for the dark gradient */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            borderRadius: '1.375rem',
                        }} />

                        <div className="flex flex-row flex-1 justify-between items-center relative z-10">
                            <div className="text-base text-white mb-2" style={{
                                fontSize: '1rem',
                                fontWeight: '500',
                                opacity: '0.9'
                            }}>
                                SIGHT TOKENS
                            </div>
                            <div className="text-4xl font-bold text-white" style={{
                                fontSize: '2.5rem',
                                fontFamily: 'Aldrich',
                                letterSpacing: '0.05em'
                            }}>
                                ${(summary?.earning_info.total_block_rewards || 0).toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}