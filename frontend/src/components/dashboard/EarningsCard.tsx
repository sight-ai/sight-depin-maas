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
            <h2 className="text-2xl mb-3 text-black" style={{
                color: isDark ? '#fff' : '#000'
            }}>Earnings</h2>
            <Card className="bg-white" style={{
                // backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
                borderRadius: '1rem'
            }}>

                <div className="flex gap-10 mt-5">
                    <div className='flex items-center flex-1' style={{
                        background: 'linear-gradient(90deg, #F6A355 0%, #E94B81 50%, #7B61FF 100%)',
                        padding: '2rem',
                        borderRadius: '1rem',
                        minHeight: '120px'
                    }}>

                        <div className="flex flex-row flex-1 justify-between items-center">
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
                                ${(summary?.earning_info.total_block_rewards || 1000).toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}