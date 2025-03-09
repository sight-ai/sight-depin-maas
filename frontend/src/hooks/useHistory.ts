'use client'

import { useState, useEffect } from 'react'

interface HistoryItem {
  requestId: string
  tokenUsage: string
  reward: string
  status: string
}

export function useHistory() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([
    { requestId: 'abs7efg', tokenUsage: '135', reward: '100', status: 'In-Progress' },
    { requestId: 'suwnajd', tokenUsage: '255', reward: '250', status: 'Done' },
    { requestId: 'swbdhxa', tokenUsage: '127', reward: '100', status: 'Active' },
    { requestId: 'shqlid87', tokenUsage: '201', reward: '200', status: 'Active' },
    { requestId: 'shqiy567', tokenUsage: '418', reward: '400', status: 'Active' },
    { requestId: 'shwisb4s', tokenUsage: '189', reward: '200', status: 'Active' },
    { requestId: 'abs7efg', tokenUsage: '245', reward: '200', status: 'Active' },
    { requestId: 'suwnajd', tokenUsage: '127', reward: '100', status: 'Active' },
    { requestId: 'shqiy567', tokenUsage: '421', reward: '400', status: 'Active' },
    { requestId: 'shwisb4s', tokenUsage: '189', reward: '200', status: 'Active' },
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: 从API获取历史数据
    // fetchHistoryData()
  }, [])

  const fetchHistoryData = async () => {
    try {
      setLoading(true)
      // TODO: 实现从API获取历史数据的逻辑
      // const response = await api.getHistory()
      // setHistoryItems(response.data)
      setError(null)
    } catch (err) {
      setError('获取历史数据失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const refreshHistory = async () => {
    await fetchHistoryData()
  }

  return {
    historyItems,
    loading,
    error,
    refreshHistory
  }
}