'use client'

import { useThemeCus } from '@/hooks/useTheme'
import { Card } from '@nextui-org/react'


export function EarningsCard() {
    let { isDark } = useThemeCus()

    return (
        <Card className="p-8 bg-white flex-1" style={{
            backgroundColor: isDark ? '#1a1a1a':'#f6f6f6',
                borderRadius: '2rem'
        }}>
            <h2 className="text-2xl font-semibold mb-3 text-black" style={{
                color: isDark ? '#fff' : '#000'
            }}>Earnings</h2>
            <div className="flex gap-10 mt-5">
                <div className='flex items-center flex-1' style={{ backgroundColor: isDark ? '#000' :  '#fff',  padding: 15, borderRadius: 13 }}>
                    <div className="text-base text-black mb-1 mr-6" style={{
                        color: isDark ? '#fff' : '#000',
                    }}>LIFETIME  <div>BLOCK REWARDS</div></div>
                    <div className="text-4xl font-bold text-black"  style={{
                        color: isDark ? '#fff' : '#000',
                        fontFamily: 'Aldrich'
                    }}>$ 200</div>
                </div>
                <div className='flex items-center flex-1' style={{ backgroundColor:  isDark ? '#000' :'#fff', padding: 15, borderRadius: 13 }}>
                    <div className="text-base text-black mb-1 mr-6"  style={{
                        color: isDark ? '#fff' : '#000',
                    }}>JOB EARNINGS</div>
                    <div className="text-4xl font-bold text-black"  style={{
                        color: isDark ? '#fff' : '#000',
                        fontFamily: 'Aldrich'
                    }}>$ 100</div>
                </div>
            </div>
        </Card>
    )
}