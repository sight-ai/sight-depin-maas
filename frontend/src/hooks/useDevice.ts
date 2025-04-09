'use client'

import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'

export function useDevice() {
  let [data, setData] = useState<{ deviceId: string, rewardAddress: string | null } | null>(null)
  
  const fetchDeviceData = async () => {
    try {
      const deviceData = await apiService.getCurrentDevice();
      setData(deviceData);
    } catch (error) {
      console.error('Error fetching device data:', error);
    }
  }

  useEffect(() => {
    fetchDeviceData();
    const interval = setInterval(fetchDeviceData, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  return {
    data
  }
} 