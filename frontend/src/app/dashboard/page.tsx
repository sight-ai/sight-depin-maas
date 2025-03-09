'use client'

import { Card } from '@nextui-org/react'
import { Button } from '@nextui-org/button'
import Echarts from '@/components/Echarts'
import Image from 'next/image'
import { EarningsCard } from '@/components/dashboard/EarningsCard'
import { DeviceCard } from '@/components/dashboard/DeviceCard'
import { UptimeCard } from '@/components/dashboard/UptimeCard'
import { Header } from '@/components/Header'
import { MainContent } from '@/components/MainContent'
import { useDashboard } from '@/hooks/useDashboard'
import { useThemeCus } from '@/hooks/useTheme'

export default function DashboardPage() {
    const { statistics, refreshStatistics } = useDashboard()
    let { isDark } = useThemeCus()

    return (
      <MainContent>
        <main className="flex-1 p-8 space-y-8 bg-white" style={{
            backgroundColor: isDark? '#000': "#fff"
        }}>
            <Header></Header>
            <div style={{
                fontWeight: 800,
                fontSize: '2.5em',
                color: isDark ? '#fff': '#000',
                marginTop: 0
            }}>Dashboard</div>
            <div className="flex justify-between items-start">
                <div className="flex-1 flex">
                    <EarningsCard />
                    <DeviceCard />
                </div>
            </div>
            <UptimeCard />
            <Card className=' rounded-lg' style={{
                backgroundColor: isDark ? '#1a1a1a':'#f6f6f6'
            }} >
                <div className="space-y-5 p-3 rounded-lg m-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold text-black" style={{
                            color: isDark ? '#fff': '#000'
                        }}>Earning Statistics</h2>
                        <Button className="text-black" onPress={refreshStatistics}>
                            <span className="material-icons flex" style={{
                            color: isDark ? '#fff': '#000'
                        }}><Image src={isDark ? "/Refresh (1).svg" : "/Refresh.svg"} alt="SIGHT Logo" width={25} height={25} className="mr-3" /> Refresh</span>
                        </Button>
                    </div>
                    <Echarts></Echarts>
                </div>
            </Card>
        </main>
        </MainContent>
    )
}