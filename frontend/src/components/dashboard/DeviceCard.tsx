'use client'

import { Card } from '@nextui-org/react'
import { Button } from '@nextui-org/button'
import Image from 'next/image'
import { useThemeCus } from '@/hooks/useTheme'

export function DeviceCard() {
    let { isDark } = useThemeCus()

    return (
        <Card className="p-8 bg-white ml-6 flex-1 " style={{
            backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
            borderRadius: '2rem'
        }}>
            <h2 className="text-2xl  mb-3 text-black underline flex" style={{
                fontSize: '2.075em',
                color: isDark ? '#fff' : '#000'
            }}>Sight-01   <Image src="/Vector 1.svg" alt="SIGHT Logo" width={20} height={20} className='ml-5' style={{ height: 'auto' }} /></h2>
            <div className="flex items-start gap-1 flex-col mt-3">
            <div className="flex items-center gap-3">
                <div className="text-base font-semibold text-black font-ibm-mono" style={{
                    color: isDark ? '#fff' : '#000',
                }}>Device</div>
                <div className="text-base text-black bg-[red] font-ibm-mono" style={{
                    color: isDark ? '#fff' : '#000',
                }}>Macbook Pro 16''</div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-base font-semibold text-black font-ibm-mono" style={{
                    color: isDark ? '#fff' : '#000',
                }}>Status</div>
                <div className="text-base text-black font-ibm-mono" style={{
                    color: isDark ? '#fff' : '#000',
                }}>Offline</div>
            </div>
                <div className='flex justify-end flex-1 w-full'>
                    <Button
                        style={{
                            width: '12rem',
                            borderRadius: '3rem',
                            backgroundColor: isDark ? '#fff' : '#000'
                        }}
                        className={`flex items-center justify-center gap-5 py-4 px-5 ${'bg-black text-white'}`}
                        variant="light"
                        onPress={() => { }}
                    >
                        <span className="text-base font-medium flex">
                            <Image src={isDark ? "Group 13.svg":"/Group 15.svg"}  alt="SIGHT Logo" width={25} height={25} className="mr-2" style={{ height: 'auto' }} />
                            <span style={{
                                color: isDark ? '#000' : '#fff',

                            }}>Connect</span></span>
                    </Button>
                </div>
            </div>
        </Card>
    )
}