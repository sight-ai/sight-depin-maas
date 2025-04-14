'use client'

import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'

export function useDevice() {
  let [data, setData] = useState<{ 
    deviceId: string, 
    rewardAddress: string | null,
    status: 'online' | 'offline'
  } | null>(null)
  
  let [gatewayStatus, setGatewayStatus] = useState<{ isRegistered: boolean }>({ isRegistered: false })
  
  const fetchDeviceData = async () => {
    try {
      const [deviceData, gatewayData] = await Promise.all([
        apiService.getCurrentDevice(),
        apiService.getGatewayStatus()
      ]);
      setData(deviceData);
      setGatewayStatus(gatewayData);
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
    data,
    gatewayStatus
  }
} 