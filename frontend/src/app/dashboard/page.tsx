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
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
}

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

export default function DashboardPage() {
    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')
    const [filter, setFilter] = useState<{ year?: string; month?: string; view?: 'Month' | 'Year' }>({
        year: '2025',
        month: 'Mar',
        view: 'Year'
    })
    const { summary, loading, error, refreshStatistics } = useDashboard(timeRange, filter)
    const { isDark } = useThemeCus()

    const handleTimeRangeChange = (range: 'daily' | 'weekly' | 'monthly') => {
        setTimeRange(range)
    }

    const handleFilterChange = useCallback((newFilter: { year?: string; month?: string; view?: 'Month' | 'Year' }) => {
        setFilter(prevFilter => {
            if (JSON.stringify(prevFilter) === JSON.stringify(newFilter)) {
                return prevFilter
            }
            return newFilter
        })
    }, [])

    return (
        <MainContent>
            <motion.main
                initial="initial"
                animate="animate"
                variants={staggerContainer}
                className="flex-1 p-8 space-y-8 bg-white"
                style={{
                    backgroundColor: isDark ? '#000' : "#fff"
                }}
            >
                <motion.div variants={fadeInUp}>
                    <Header></Header>
                </motion.div>
                
                <motion.div
                    variants={fadeInUp}
                    style={{
                        fontWeight: 800,
                        fontSize: '2.5em',
                        color: isDark ? '#fff' : '#000',
                        marginTop: 0
                    }}
                >
                    Dashboard
                </motion.div>

                <motion.div 
                    variants={fadeInUp}
                    className="flex justify-between items-start"
                >
                    <div className="flex-1 flex">
                        <EarningsCard summary={summary} loading={loading} error={error} />
                        <DeviceCard 
                            summary={summary} 
                            loading={loading} 
                            error={error} 
                            onFilterChange={handleFilterChange}
                        />
                    </div>
                </motion.div>

                <motion.h2 
                    variants={fadeInUp}
                    className="text-xl font-medium"
                    style={{
                        color: isDark ? '#fff' : '#000'
                    }}
                >
                    Total AI Requests Processed
                </motion.h2>

                <motion.div
                    variants={fadeInUp}
                >
                    <Card className='rounded-lg' style={{
                        backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
                        borderRadius: '1rem',
                        marginBottom: '2rem'
                    }}>
                        <div className="p-6">
                            <div className="flex items-center justify-end mb-6">
                                <div className="flex gap-4">
                                    {['daily', 'weekly', 'monthly'].map((range) => (
                                        <motion.span
                                            key={range}
                                            onClick={() => handleTimeRangeChange(range as 'daily' | 'weekly' | 'monthly')}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            style={{
                                                color: timeRange === range ? (isDark ? '#fff' : '#000') : (isDark ? '#999' : '#666'),
                                                fontSize: '0.875rem',
                                                padding: '0 0.5rem',
                                                backgroundColor: timeRange === range ? (isDark ? '#333' : '#eee') : 'transparent',
                                                borderRadius: '1rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {range}
                                        </motion.span>
                                    ))}
                                </div>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                style={{
                                    height: '280px'
                                }}
                            >
                                <Echarts summary={summary} type='requests' timeRange={timeRange} />
                            </motion.div>
                        </div>
                    </Card>
                </motion.div>

                <motion.h2
                    variants={fadeInUp}
                    className="text-xl font-medium"
                    style={{
                        color: isDark ? '#fff' : '#000'
                    }}
                >
                    Earning Statistics
                </motion.h2>

                <motion.div
                    variants={fadeInUp}
                >
                    <Card className='rounded-lg' style={{
                        backgroundColor: isDark ? '#1a1a1a' : '#f6f6f6',
                        borderRadius: '1rem'
                    }}>
                        <div className="p-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                style={{
                                    height: '280px'
                                }}
                            >
                                <Echarts summary={summary} type='earnings' timeRange={timeRange} />
                            </motion.div>
                        </div>
                    </Card>
                </motion.div>
            </motion.main>
        </MainContent>
    )
}