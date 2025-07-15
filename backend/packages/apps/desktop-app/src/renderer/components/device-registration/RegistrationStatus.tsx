/**
 * 设备注册状态组件
 * 显示设备注册状态和基本信息
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { CheckCircle, Copy, AlertTriangle } from 'lucide-react';

interface RegistrationStatusProps {
  isRegistered: boolean;
  deviceId: string;
  deviceName: string;
  gateway: string;
  rewardAddress: string;
  code: string;
  onCopy: (text: string) => Promise<void>;
}

export const RegistrationStatus: React.FC<RegistrationStatusProps> = ({
  isRegistered,
  deviceId,
  deviceName,
  gateway,
  rewardAddress,
  code,
  onCopy
}) => {
  if (!isRegistered) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-6">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">Device Not Registered</h3>
              <p className="text-sm text-yellow-600">
                Please complete the registration form below to register your device.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <CardContent className="p-0 space-y-6">
        {/* 注册成功状态 */}
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-medium text-green-800">Device Successfully Registered</h3>
            <p className="text-sm text-green-600">
              Your device is connected and ready to earn rewards
            </p>
          </div>
        </div>

        {/* 设备信息 */}
        <div className="space-y-4">
          <h2 className="text-xl font-medium text-black">Device Information</h2>
          
          {/* Device ID */}
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-4 py-3 bg-white">
              <div className="text-base text-gray-900 font-normal break-all">
                {deviceId || 'Not available'}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
                Device ID
              </div>
            </div>
            {deviceId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCopy(deviceId)}
                className="absolute right-2 top-2 h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Device Name */}
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-4 py-3 bg-white">
              <div className="text-base text-gray-900 font-normal">
                {deviceName || 'Not available'}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
                Device Name
              </div>
            </div>
          </div>

          {/* Registration Code */}
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-4 py-3 bg-white">
              <div className="text-base text-gray-900 font-normal">
                {code || 'Not available'}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
                Registration Code
              </div>
            </div>
            {code && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCopy(code)}
                className="absolute right-2 top-2 h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Gateway */}
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-4 py-3 bg-white">
              <div className="text-base text-gray-900 font-normal">
                {gateway || 'Not available'}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
                Gateway
              </div>
            </div>
            {gateway && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCopy(gateway)}
                className="absolute right-2 top-2 h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Reward Address */}
          <div className="relative">
            <div className="border border-gray-400 rounded-lg px-4 py-3 bg-white">
              <div className="text-base text-gray-900 font-normal break-all">
                {rewardAddress || 'Not available'}
              </div>
              <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
                Reward Address
              </div>
            </div>
            {rewardAddress && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCopy(rewardAddress)}
                className="absolute right-2 top-2 h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 注册信息概览 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Registration Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Status</div>
              <div className="font-medium text-green-600">Active</div>
            </div>
            <div>
              <div className="text-gray-600">Registration Date</div>
              <div className="font-medium text-gray-800">{new Date().toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Device Type</div>
              <div className="font-medium text-gray-800">SightAI Node</div>
            </div>
            <div>
              <div className="text-gray-600">Network</div>
              <div className="font-medium text-gray-800">Mainnet</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
