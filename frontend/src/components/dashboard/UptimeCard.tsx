'use client'

import { useThemeCus } from '@/hooks/useTheme'
import { Card } from '@nextui-org/react'

export function UptimeCard() {
    let { isDark } = useThemeCus()
    return (
        <Card className="p-5 bg-white flex-1" style={{
            backgroundColor: isDark ? '#1a1a1a':'#f6f6f6',
            borderRadius: '2rem'

        }}>
            <div style={{ color: '#000' }} className='flex justify-end'>
                <span className="text-base"  style={{
                        color: isDark ? '#fff' : '#000',
                    }}>Last 30 days (Feb 03-Mar 04) 8% Uptime</span>
            </div>
            <div className='flex mt-7 items-center justify-around mb-5'>
                {
                    new Array(30).fill('').map((item, index) => (
                        <div key={index} style={{
                            width: '2rem',
                            height: '2rem',
                            backgroundColor: '#60677B',
                            borderRadius: '0.3rem',
                            marginRight: '0.4rem'
                        }}></div>
                    ))
                }
            </div>
        </Card>
    )
}