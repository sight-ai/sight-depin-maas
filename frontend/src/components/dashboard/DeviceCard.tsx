'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useThemeCus } from '@/hooks/useTheme'
import { SummaryResponse } from '@/types/api'
import { useDevice } from '@/hooks/useDeviceStatus'
import { Loader2 } from 'lucide-react'
import { Card } from '../ui/card'

export function DeviceCard({ summary, loading,
    error, }: { summary: SummaryResponse | null, loading: boolean, error: string | null }) {
    const { isDark } = useThemeCus()
    const deviceInfo = summary?.device_info
    const { data } = useDevice()

    return (
        <Card className="p-8 pb-0 bg-card ml-6 flex-1 rounded-2xl"
        >
            <h2 className="text-2xl mb-3 text-primary underline flex" style={{
                fontSize: '2.075em',
            }}>
                {deviceInfo?.name || 'Unknown Device'}
                <Image src="/Vector 1.svg" alt="SIGHT Logo" width={20} height={20} className='ml-5' style={{ height: 'auto' }} />
            </h2>
            <div className="flex items-start gap-1 flex-col pt-5 relative mb-10">
                <>
                    <div className="flex items-center gap-3">
                        <div className="text-base font-semibold text-primary font-ibm-mono">Device</div>
                        {!loading ? <div className="text-base text-primary font-ibm-mono">{data?.name || 'Unknown Device'}</div> : <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-base font-semibold text-primary font-ibm-mono">Status</div>
                        {!loading ? <div className="text-base text-primary font-ibm-mono">{data.status}</div> : <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                    </div>

                    <div className='flex justify-end flex-1 w-full absolute bottom-0'>
                        <Button
                            className={`flex items-center justify-center gap-5 py-4 px-5 rounded-full`}
                            style={{
                                width: '12rem',
                                borderRadius: '3rem',
                                backgroundColor: isDark ? '#fff' : '#000',
                                color: isDark ? '#000' : '#fff'
                            }}
                            variant="secondary"
                            onClick={() => { }}
                        >
                            <span className="text-base font-medium flex">
                                <Image
                                    src={isDark ? "Group 13.svg" : "/Group 15.svg"}
                                    alt="SIGHT Logo"
                                    width={25}
                                    height={25}
                                    className="mr-2"
                                    style={{ height: 'auto' }}
                                />
                                <span>{data.status == 'online' ? 'connected' : 'disconnect'}</span>
                            </span>
                        </Button>
                    </div>
                </>
            </div>
        </Card>
    )
}