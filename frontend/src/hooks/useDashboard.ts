'use client'

import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'
import { SummaryResponse } from '@/types/api'

export function useDashboard() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getSummary()
      setSummary(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Failed to load dashboard data')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const refreshStatistics = async () => {
    await fetchDashboardData()
  }

  const connectDevice = async () => {
    // TODO: 实现设备连接逻辑
    // await connectToDevice(device.name)
  }

  return {
    summary,
    loading,
    error,
    refreshStatistics,
    connectDevice
  }
}

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
