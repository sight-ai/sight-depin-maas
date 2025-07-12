/**
 * Device Registration页面组件
 *
 * 重构后的组件化架构：
 * - 使用Dashboard的注册状态作为权威数据源
 * - 组件拆分提高可维护性
 * - 优化性能，避免重复API调用
 */

import React, { useState } from 'react';
import { BackendStatus } from '../hooks/types';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDeviceRegistrationData } from '../hooks/useDeviceRegistrationData';
import { RegistrationStatus } from './device-registration/RegistrationStatus';
import { RegistrationForm } from './device-registration/RegistrationForm';
import { RegistrationActions } from './device-registration/RegistrationActions';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface DeviceRegistrationProps {
  backendStatus: BackendStatus;
}

export const DeviceRegistration: React.FC<DeviceRegistrationProps> = ({ backendStatus }) => {
  // 获取Dashboard数据作为权威数据源
  const { data: dashboardData, error: dashboardError } = useDashboardData(backendStatus);

  // 使用优化的设备注册Hook
  const {
    data: registrationData,
    error: registrationError,
    isSubmitting,
    registerDevice,
    updateDid,
    refreshData,
    copyToClipboard
  } = useDeviceRegistrationData(backendStatus, dashboardData.deviceInfo);

  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // 处理复制操作
  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess('Copied to clipboard!');
      setTimeout(() => setCopySuccess(null), 2000);
    } else {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // 处理设备注册
  const handleRegisterDevice = async (formData: { code: string; gateway: string; rewardAddress: string }) => {
    try {
      await registerDevice(formData);
      setCopySuccess('Device registered successfully!');
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  // 处理DID更新
  const handleUpdateDid = async () => {
    try {
      await updateDid();
      setCopySuccess('DID updated successfully!');
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (error) {
      console.error('DID update failed:', error);
    }
  };

  // 错误状态显示
  if (dashboardError && !dashboardData) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Failed to Load Device Registration
              </h2>
              <p className="text-gray-600 mb-4">{dashboardError}</p>
              <Button onClick={() => window.location.reload()} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Device Registration</h1>
            <p className="text-gray-600">Register your device to start earning rewards</p>
          </div>
          <div className="flex items-center gap-4">
            {copySuccess && (
              <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                {copySuccess}
              </span>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {registrationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">
                {registrationError}
              </span>
            </div>
          </div>
        )}

        {/* 注册状态显示 */}
        <RegistrationStatus
          isRegistered={registrationData.isRegistered}
          deviceId={registrationData.deviceId}
          deviceName={registrationData.deviceName}
          gateway={registrationData.gateway}
          rewardAddress={registrationData.rewardAddress}
          code={registrationData.code}
          onCopy={handleCopy}
        />

        {/* 注册表单 */}
        <RegistrationForm
          isRegistered={registrationData.isRegistered}
          initialData={{
            code: registrationData.code,
            gateway: registrationData.gateway,
            rewardAddress: registrationData.rewardAddress
          }}
          onSubmit={handleRegisterDevice}
          isSubmitting={isSubmitting}
          error={registrationError}
        />

        {/* 操作按钮 */}
        <RegistrationActions
          isRegistered={registrationData.isRegistered}
          onRefresh={refreshData}
          onUpdateDid={handleUpdateDid}
          isLoading={isSubmitting}
        />

        {/* 页面底部信息 */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>
            Registration Status: {registrationData.isRegistered ? 'Registered' : 'Not Registered'} |
            Backend: {backendStatus?.isRunning ? 'Connected' : 'Disconnected'} |
            Data Source: Dashboard API
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeviceRegistration;