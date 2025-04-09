'use client'

import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'

export function useDevice() {
  let [data, setData] = useState<any>({})
  let [deviceId, setDeviceId] = useState<string>('')
  
  const fetchDeviceId = async () => {
    try {
      const currentDevice = await apiService.getCurrentDevice();
      if (currentDevice && currentDevice.deviceId) {
        setDeviceId(currentDevice.deviceId);
      }
    } catch (error) {
      console.error('Error fetching device ID:', error);
    }
  }
  
  const fetchDashboardData = async () => {
    if (!deviceId) return;
    try {
      let data:any = await apiService.getDeviceStatus(deviceId);
      setData(data);
    } catch (error) {
      console.error('Error fetching device status:', error);
    }
  }

  useEffect(() => {
    fetchDeviceId();
  }, []);

  useEffect(() => {
    if (deviceId) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 1000 * 30);
      return () => clearInterval(interval);
    }
  }, [deviceId]);

  return {
    fetchDashboardData,
    data
  }
}
