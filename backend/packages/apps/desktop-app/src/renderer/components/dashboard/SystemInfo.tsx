/**
 * 系统信息组件
 * 显示系统状态、版本、运行时间等基础信息
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { CheckCircle, WifiOff, Copy } from 'lucide-react';
import { Button } from '../ui/button';

interface SystemInfoProps {
  systemStatus: string;
  systemPort: string;
  version: string;
  uptime: string;
  deviceInfo?: {
    isRegistered: boolean;
    deviceId: string;
    deviceName: string;
  };
  onCopyToClipboard?: (text: string) => void;
}

export const SystemInfo: React.FC<SystemInfoProps> = ({
  systemStatus,
  systemPort,
  version,
  uptime,
  deviceInfo,
  onCopyToClipboard
}) => {
  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <CardContent className="p-0 space-y-6">
        <h2 className="text-xl font-medium text-black">Basic Information</h2>

        {/* 设备注册状态 */}
        {deviceInfo && (
          <div className={`border rounded-lg p-4 ${
            deviceInfo.isRegistered 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              {deviceInfo.isRegistered ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-yellow-600" />
              )}
              <div>
                <h3 className={`font-medium ${
                  deviceInfo.isRegistered ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {deviceInfo.isRegistered ? 'Device Registered Successfully' : 'Device Not Registered'}
                </h3>
                <p className={`text-sm ${
                  deviceInfo.isRegistered ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {deviceInfo.isRegistered 
                    ? 'Your device is connected and earning rewards'
                    : 'Register your device to start earning rewards'
                  }
                </p>
              </div>
            </div>

            {deviceInfo.isRegistered && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Device ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {formatAddress(deviceInfo.deviceId)}
                    </code>
                    {onCopyToClipboard && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCopyToClipboard(deviceInfo.deviceId)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Device Name:</span>
                  <span className="font-medium">{deviceInfo.deviceName}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 系统信息输入框 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 系统状态 */}
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-4 py-3 bg-white">
              <div className={`text-base font-normal ${
                systemStatus === 'ONLINE' ? 'text-green-500' : 'text-red-500'
              }`}>
                {systemStatus}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
                SIGHTAI_SYSTEM_STATUS
              </div>
            </div>
            <div className="mt-1.5 px-4 text-xs text-green-500">
              [PORT: {systemPort}]
            </div>
          </div>

          {/* 版本 */}
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-4 py-3 bg-white">
              <div className="text-base text-gray-900 font-normal">
                {version}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
                Version
              </div>
            </div>
          </div>

          {/* 运行时间 */}
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-4 py-3 bg-white">
              <div className="text-base text-gray-900 font-normal">
                {uptime}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
                Uptime
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
