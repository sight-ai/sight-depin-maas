'use client'

import { useState, useEffect } from 'react'

interface EarningsData {
  lifetimeBlockRewards: number
  jobEarnings: number
}

interface DeviceData {
  name: string
  status: 'Online' | 'Offline'
}

interface UptimeData {
  days: number[]
  percentage: number
  dateRange: string
}

interface EarningStatistics {
  dates: string[]
  values: number[]
}

export function useDashboard() {
  const [earnings, setEarnings] = useState<EarningsData>({
    lifetimeBlockRewards: 0,
    jobEarnings: 0
  })

  const [device, setDevice] = useState<DeviceData>({
    name: 'Macbook Pro 16\'\'\'',
    status: 'Offline'
  })

  const [uptime, setUptime] = useState<UptimeData>({
    days: new Array(30).fill(0),
    percentage: 8,
    dateRange: 'Last 30 days (Feb 03-Mar 04)'
  })

  const [statistics, setStatistics] = useState<EarningStatistics>({
    dates: ['8\nFeb', '9\nFeb', '10\nFeb', '11\nFeb', '12\nFeb', '13\nFeb', '14\nFeb'],
    values: [0, 0, 0, 0, 0, 0, 0]
  })

  useEffect(() => {
    // TODO: 从API获取数据
    // fetchDashboardData()
  }, [])

  const refreshStatistics = async () => {
    // TODO: 实现刷新统计数据的逻辑
    // await fetchStatisticsData()
  }

  const connectDevice = async () => {
    // TODO: 实现设备连接逻辑
    // await connectToDevice(device.name)
  }

  return {
    earnings,
    device,
    uptime,
    statistics,
    refreshStatistics,
    connectDevice
  }
}