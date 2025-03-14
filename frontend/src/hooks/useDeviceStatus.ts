'use client'

import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'
import { SummaryResponse } from '@/types/api'

export function useDevice() {
  let [data, setData] = useState<any>({})
  function getDeviceName() {
    const userAgent = navigator.userAgent;
    let deviceName = 'Unknown Device';
  
    if (/Android/i.test(userAgent)) {
      deviceName = 'Android Device';
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      deviceName = 'iOS Device';
    } else if (/Windows NT/i.test(userAgent)) {
      deviceName = 'Windows Device';
    } else if (/Macintosh/i.test(userAgent)) {
      deviceName = 'Mac Device';
    }
  
    return deviceName;
  }
  
  const fetchDashboardData = async () => {
    let data:any = await apiService.getDeviceStatus()
    console.log(data)
    setData(data)
  }

  useEffect(() => {
    fetchDashboardData()
    setInterval(() => {
      fetchDashboardData()
    }, 1000*30);
  }, [])

  return {
    fetchDashboardData,
    data
  }
}
