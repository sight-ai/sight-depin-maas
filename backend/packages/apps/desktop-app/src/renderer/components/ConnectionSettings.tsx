import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  X
} from 'lucide-react';
import { Card } from './ui/card';
import { createApiClient, handleApiError } from '../utils/api-client';

interface RegistrationStatus {
  status: 'registered' | 'unregistered' | 'pending';
  deviceId: string;
  deviceName: string;
  message: string;
}

interface DeviceConfig {
  deviceId: string;
  deviceName: string;
  gatewayAddress: string;
  rewardAddress: string;
  code: string;
}

export const ConnectionSettings: React.FC = () => {
  // 性能优化：使用 useRef 避免不必要的重渲染
  const configCacheRef = useRef<{ data: any; timestamp: number } | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
    status: 'unregistered',
    deviceId: '',
    deviceName: '',
    message: ''
  });

  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig>({
    gatewayAddress: '',
    rewardAddress: '',
    code: '',
    deviceId: '',
    deviceName: ''
  });
  const [gatewayAddress, setGatewayAddress] = useState('https://sightai.io/api/model');
  const [rewardAddress, setRewardAddress] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copyStates, setCopyStates] = useState<{[key: string]: 'idle' | 'copied'}>({});

  // 性能优化：添加防抖状态
  const [isUpdating, setIsUpdating] = useState(false);

  // Form validation states
  const [validationErrors, setValidationErrors] = useState<{
    gatewayAddress?: string;
    rewardAddress?: string;
    registrationCode?: string;
  }>({});

  // Validation functions
  const validateGatewayAddress = (address: string): string | null => {
    if (!address.trim()) {
      return 'Gateway address is required';
    }
    try {
      const url = new URL(address);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Gateway address must use HTTP or HTTPS protocol';
      }
      return null;
    } catch {
      return 'Invalid gateway address format';
    }
  };

  const validateRewardAddress = (address: string): string | null => {
    if (!address.trim()) {
      return 'Reward address is required';
    }
    // Basic validation for common address formats
    if (address.length < 10) {
      return 'Reward address is too short';
    }
    if (address.length > 100) {
      return 'Reward address is too long';
    }
    // Check for valid characters (alphanumeric and common special chars)
    if (!/^[a-zA-Z0-9._-]+$/.test(address)) {
      return 'Reward address contains invalid characters';
    }
    return null;
  };

  const validateRegistrationCode = (code: string): string | null => {
    if (!code.trim()) {
      return 'Registration code is required';
    }
    if (code.length < 6) {
      return 'Registration code must be at least 6 characters';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    const gatewayError = validateGatewayAddress(gatewayAddress);
    if (gatewayError) errors.gatewayAddress = gatewayError;

    const rewardError = validateRewardAddress(rewardAddress);
    if (rewardError) errors.rewardAddress = rewardError;

    const codeError = validateRegistrationCode(registrationCode);
    if (codeError) errors.registrationCode = codeError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Copy to clipboard function
  const handleCopy = async (text: string, key: string) => {
    try {
      if (window.electronAPI?.clipboard) {
        window.electronAPI.clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }

      setCopyStates(prev => ({ ...prev, [key]: 'copied' }));

      // Reset copy state after 2 seconds
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [key]: 'idle' }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };



  // 性能优化：使用缓存和防抖的配置加载
  const loadDeviceConfig = useCallback(async () => {
    // 检查缓存
    const now = Date.now();
    if (configCacheRef.current && (now - configCacheRef.current.timestamp) < 10000) {
      // 10秒内的缓存直接使用
      const cachedData = configCacheRef.current.data;
      setDeviceConfig(cachedData);
      setGatewayAddress(cachedData.gatewayAddress || 'https://sightai.io/api/model');
      setRewardAddress(cachedData.rewardAddress || '');
      setRegistrationCode(cachedData.code || '');
      return;
    }

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.readDeviceConfig();
        if (result.success && result.data) {
          // 更新缓存
          configCacheRef.current = {
            data: result.data,
            timestamp: now
          };

          setDeviceConfig(result.data);
          setGatewayAddress(result.data.gatewayAddress || 'https://sightai.io/api/model');
          setRewardAddress(result.data.rewardAddress || '');
          setRegistrationCode(result.data.code || '');
        } else {
          console.warn('Failed to load device config:', result.error);
        }
      }
    } catch (error) {
      console.error('Error loading device config:', error);
    }
  }, []);

  // 性能优化：防抖保存设备配置
  const saveDeviceConfig = useCallback(async (configUpdate: Partial<DeviceConfig>) => {
    if (isUpdating) return false;

    setIsUpdating(true);

    // 清除之前的定时器
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    return new Promise<boolean>((resolve) => {
      updateTimeoutRef.current = setTimeout(async () => {
        try {
          if (window.electronAPI && (window.electronAPI as any).updateDeviceConfig) {
            const result = await (window.electronAPI as any).updateDeviceConfig(configUpdate);
            if (result.success) {
              console.log('Device config updated successfully:', result.message);

              // 清除缓存，强制重新加载
              configCacheRef.current = null;
              await loadDeviceConfig();

              resolve(true);
            } else {
              console.error('Failed to update device config:', result.error);
              resolve(false);
            }
          } else {
            resolve(false);
          }
        } catch (error) {
          console.error('Error saving device config:', error);
          resolve(false);
        } finally {
          setIsUpdating(false);
        }
      }, 500); // 500ms 防抖延迟
    });
  }, [isUpdating, loadDeviceConfig]);

  // 新增：获取完整配置
  const loadAllConfig = async () => {
    try {
      if (window.electronAPI && (window.electronAPI as any).getAllConfig) {
        const result = await (window.electronAPI as any).getAllConfig();
        if (result.success && result.data) {
          console.log('All config loaded:', result.data);
          // 可以在这里处理完整的配置数据
          if (result.data.device) {
            setDeviceConfig(result.data.device);
            setGatewayAddress(result.data.device.gatewayAddress || '');
            setRewardAddress(result.data.device.rewardAddress || '');
            setRegistrationCode(result.data.device.code || '');
          }
        }
      }
    } catch (error) {
      console.error('Error loading all config:', error);
    }
  };

  // 新增：验证配置
  const validateConfiguration = async () => {
    try {
      if (window.electronAPI && (window.electronAPI as any).validateConfig) {
        const result = await (window.electronAPI as any).validateConfig();
        if (result.success && result.data) {
          console.log('Config validation result:', result.data);
          return result.data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error validating config:', error);
      return null;
    }
  };

  // Get current registration status
  const fetchRegistrationStatus = async () => {
    try {
      const response = await fetch('http://localhost:8716/api/v1/device-status/gateway-status');
      const data = await response.json();

      if (data.isRegistered) {
        // Device is registered, use config data for display
        setRegistrationStatus({
          status: 'registered',
          deviceId: deviceConfig?.deviceId || '',
          deviceName: deviceConfig?.deviceName || '',
          message: 'Device is registered and connected'
        });
      } else {
        setRegistrationStatus({
          status: 'unregistered',
          deviceId: '',
          deviceName: '',
          message: 'Device is not registered'
        });
      }
    } catch (error) {
      console.error('Error fetching registration status:', error);
      setRegistrationStatus({
        status: 'unregistered',
        deviceId: '',
        deviceName: '',
        message: 'Failed to get status'
      });
    }
  };

  const getDetailedErrorMessage = (error: any, data?: any): string => {
    // Network/Connection errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return 'Unable to connect to the backend service. Please check if the service is running.';
    }

    // API response errors
    if (data?.error) {
      const errorMsg = data.error.toLowerCase();
      if (errorMsg.includes('gateway')) {
        return 'Gateway connection failed. Please verify the gateway address and network connectivity.';
      }
      if (errorMsg.includes('tunnel')) {
        return 'Tunnel service communication failed. Please check the tunnel service status.';
      }
      if (errorMsg.includes('registration rejected')) {
        return 'Registration was rejected by the gateway. Please verify your registration code.';
      }
      if (errorMsg.includes('timeout')) {
        return 'Registration request timed out. Please check your network connection and try again.';
      }
      if (errorMsg.includes('invalid')) {
        return 'Invalid registration credentials. Please check your gateway address and registration code.';
      }
      if (errorMsg.includes('failed to process response')) {
        return 'Failed to process gateway response. The gateway may be experiencing issues.';
      }
      if (errorMsg.includes('send failed')) {
        return 'Failed to send registration request. Please check your network connection.';
      }
      return data.error;
    }

    // HTTP status errors
    if (error?.status) {
      switch (error.status) {
        case 400:
          return 'Invalid registration data. Please check your input and try again.';
        case 401:
          return 'Authentication failed. Please verify your registration code.';
        case 403:
          return 'Access denied. Your registration code may be invalid or expired.';
        case 404:
          return 'Registration service not found. Please contact support.';
        case 500:
          return 'Server error occurred during registration. Please try again later.';
        case 503:
          return 'Registration service is temporarily unavailable. Please try again later.';
        default:
          return `Registration failed with status ${error.status}. Please try again.`;
      }
    }

    // Generic error
    return 'Registration failed due to an unexpected error. Please try again.';
  };

  const handleRegisterDevice = async () => {
    // Validate form before submission
    if (!validateForm()) {
      setRegistrationStatus({
        status: 'unregistered',
        deviceId: '',
        deviceName: '',
        message: 'Please fix validation errors before submitting'
      });
      return;
    }

    setIsLoading(true);
    setRegistrationStatus(prev => ({
      ...prev,
      status: 'pending',
      message: 'Connecting to gateway and registering device...'
    }));

    try {
      const response = await fetch('http://localhost:8716/api/v1/device-status/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gateway_address: gatewayAddress,
          reward_address: rewardAddress,
          code: registrationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRegistrationStatus({
          status: 'registered',
          deviceId: data.deviceId || '',
          deviceName: data.deviceName || '',
          message: `Device registered successfully at ${new Date().toLocaleTimeString()}`
        });

        // 使用新的配置管理保存设备配置
        const configUpdate = {
          deviceId: data.deviceId || '',
          deviceName: data.deviceName || '',
          gatewayAddress,
          rewardAddress,
          code: registrationCode,
          isRegistered: true,
          registrationTime: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        const saveSuccess = await saveDeviceConfig(configUpdate);
        if (saveSuccess) {
          console.log('Device configuration saved successfully after registration');
        } else {
          console.warn('Failed to save device configuration after registration');
        }

        // Refresh registration status and reload config
        await loadDeviceConfig();
        await fetchRegistrationStatus();
      } else {
        const errorMessage = getDetailedErrorMessage(null, data);
        setRegistrationStatus({
          status: 'unregistered',
          deviceId: '',
          deviceName: '',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Error registering device:', error);
      const errorMessage = getDetailedErrorMessage(error);
      setRegistrationStatus({
        status: 'unregistered',
        deviceId: '',
        deviceName: '',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 新增：创建配置备份
  const createConfigBackup = async () => {
    try {
      if (window.electronAPI && (window.electronAPI as any).backupConfig) {
        const description = `Device config backup - ${new Date().toLocaleString()}`;
        const result = await (window.electronAPI as any).backupConfig(description);
        if (result.success) {
          console.log('Config backup created:', result.backupId);
          return result.backupId;
        } else {
          console.error('Failed to create config backup:', result.message);
        }
      }
      return null;
    } catch (error) {
      console.error('Error creating config backup:', error);
      return null;
    }
  };

  useEffect(() => {
    // Initialize by loading device config first, then registration status
    const initializeData = async () => {
      await loadDeviceConfig();
      await fetchRegistrationStatus();

      // 可选：加载完整配置进行验证
      await loadAllConfig();
    };
    initializeData();

    // Periodically update registration status
    const interval = setInterval(() => {
      fetchRegistrationStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Update registration status when device config changes
  useEffect(() => {
    if (deviceConfig) {
      fetchRegistrationStatus();
    } 
  }, [deviceConfig]);



  return (
    <div className="space-y-6 bg-white">
      {/* Device Registration Status - Success State */}
        <Card className="bg-white rounded-2xl p-6 shadow-lg space-y-6">
          <h3 className="text-2xl font-semibold text-black mb-6">Device Registration Status</h3>

          {/* Success Status Card */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-lg font-semibold text-green-800">Device created successfully</span>
            </div>
            <p className="text-sm text-black">
              Click 'Create' to connect your device. You will need to run a command on your device to complete the connection.
            </p>
          </div>

          {/* Device Information Fields */}
          <div className="space-y-4">
            {/* Device ID */}
            <div>
              <label className="block text-base font-semibold text-black mb-2">Device ID</label>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-mono text-black flex-1 break-all">
                  {registrationStatus.deviceId}
                </span>
                <button
                  onClick={() => handleCopy(registrationStatus.deviceId, 'deviceId')}
                  className="ml-3 flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Copy className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-black">
                    {copyStates.deviceId === 'copied' ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Device Name */}
            <div>
              <label className="block text-base font-semibold text-black mb-2">Device Name</label>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-sm font-mono text-black">
                  {registrationStatus.deviceName || 'SightAI Device'}
                </span>
              </div>
            </div>

            {/* Gateway */}
            <div>
              <label className="block text-base font-semibold text-black mb-2">Gateway</label>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-sm font-mono text-black break-all">
                  {deviceConfig.gatewayAddress}
                </span>
              </div>
            </div>

            {/* Reward Address */}
            <div>
              <label className="block text-base font-semibold text-black mb-2">Reward Address</label>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-mono text-black flex-1 break-all">
                  {deviceConfig.rewardAddress}
                </span>
                <button
                  onClick={() => handleCopy(deviceConfig.rewardAddress, 'rewardAddress')}
                  className="ml-3 flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Copy className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-black">
                    {copyStates.rewardAddress === 'copied' ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>
            </div>
          </div>

      {/* Device Registration Form */}
        <h3 className="text-2xl font-semibold text-black mb-6 mt-12">Device Registration</h3>

        {/* Registration Form Fields */}
        <div className="space-y-4 mb-6">
          {/* Registration Code */}
          <div>
            <label className="block text-base font-semibold text-black mb-2">
              Registration Code <span className="text-red-500">*</span>
            </label>
            <div className="bg-gray-50 border border-black rounded-lg p-3">
              <input
                type="text"
                value={registrationCode}
                onChange={(e) => {
                  setRegistrationCode(e.target.value);
                  if (validationErrors.registrationCode) {
                    setValidationErrors(prev => ({ ...prev, registrationCode: undefined }));
                  }
                }}
                className="w-full bg-transparent text-sm font-mono text-black outline-none"
                placeholder="9NYFO6CG"
                disabled={isLoading}
              />
            </div>
            {validationErrors.registrationCode && (
              <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.registrationCode}
              </div>
            )}
          </div>

          {/* Gateway Address */}
          <div>
            <label className="block text-base font-semibold text-black mb-2">
              Gateway Address <span className="text-red-500">*</span>
            </label>
            <div className="bg-gray-50 border border-black rounded-lg p-3">
              <input
                type="text"
                value={gatewayAddress}
                onChange={(e) => {
                  setGatewayAddress(e.target.value);
                  if (validationErrors.gatewayAddress) {
                    setValidationErrors(prev => ({ ...prev, gatewayAddress: undefined }));
                  }
                }}
                className="w-full bg-transparent text-sm font-mono text-black outline-none"
                placeholder="https://sightai.io/api/model/gateway-benchmark"
                disabled={isLoading}
              />
            </div>
            {validationErrors.gatewayAddress && (
              <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.gatewayAddress}
              </div>
            )}
          </div>

          {/* Reward Address */}
          <div>
            <label className="block text-base font-semibold text-black mb-2">
              Reward Address <span className="text-red-500">*</span>
            </label>
            <div className="bg-gray-50 border border-black rounded-lg p-3">
              <input
                type="text"
                value={rewardAddress}
                onChange={(e) => {
                  setRewardAddress(e.target.value);
                  if (validationErrors.rewardAddress) {
                    setValidationErrors(prev => ({ ...prev, rewardAddress: undefined }));
                  }
                }}
                className="w-full bg-transparent text-sm font-mono text-black outline-none"
                placeholder="0x0c45B536C69AB0B8806a65C94BAf8C8e6e71Ba7c"
                disabled={isLoading}
              />
            </div>
            {validationErrors.rewardAddress && (
              <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.rewardAddress}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <div className="flex gap-4 w-60">
            <button
              type="button"
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isLoading}
            >
              <X className="h-4 w-4 inline mr-2" />
              Cancel
            </button>
            <button
              onClick={handleRegisterDevice}
              disabled={isLoading || !registrationCode || !gatewayAddress || !rewardAddress}
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </button>
          </div>
        </div>

        {/* Note Section */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-semibold text-yellow-800 mb-2">Note</h4>
              <ul className="text-sm text-black space-y-1">
                <li>• Registration code is provided by the gateway administrator</li>
                <li>• Gateway address determines which network environment you connect to</li>
                <li>• Reward address is where your earnings will be sent (must be a valid wallet address)</li>
                <li>• Make sure all information is correct before registering</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
