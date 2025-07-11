/**
 * Device Registration页面组件 
 *
 * 遵循SOLID原则：
 * - 单一职责原则：UI组件只负责展示，业务逻辑由Hook处理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：使用专门的Hook接口
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  CheckCircle,
  Copy,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { useDeviceRegistration, DEVICE_REGISTRATION_CONSTANTS } from '../hooks/useDeviceRegistration';
import { BackendStatus } from '../hooks/types';

interface DeviceRegistrationProps {
  backendStatus: BackendStatus;
}

/**
 * 设备注册状态组件 
 */
const DeviceRegistrationStatus: React.FC<{
  isCreated: boolean;
  deviceId: string;
  deviceName: string;
  gateway: string;
  rewardAddress: string;
  message: string;
  onCopy: (text: string) => Promise<void>;
}> = ({ isCreated, deviceId, deviceName, gateway, rewardAddress, onCopy }) => {

  if (!isCreated) {
    return null; // 如果设备未创建，不显示状态部分
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium text-black" style={{
        fontFamily: 'Inter',
        fontSize: '24px',
        fontWeight: 500,
        lineHeight: '28.8px',
        letterSpacing: '-2%',
        width: '480px'
      }}>
        Device Registration Status
      </h2>

      {/* 成功状态卡片  */}
      <Card
        className="border rounded-lg w-full"
        style={{
          backgroundColor: '#E8FAEB',
          borderColor: '#ABDE9E',
          borderWidth: '1px',
          borderRadius: '8px',
          padding: '8px 16px'
        }}
      >
        <CardContent className="p-0 flex flex-col gap-1">
          <div className="flex items-center justify-center gap-2.5" style={{ width: '755px' }}>
            <CheckCircle
              className="w-5 h-5"
              style={{
                width: '20px',
                height: '20px',
                color: '#14AE5C',
                strokeWidth: 2
              }}
            />
            <span
              className="font-semibold"
              style={{
                fontFamily: 'Inter',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '19.36px',
                color: '#219921'
              }}
            >
              Device created successfully
            </span>
          </div>
          <p
            className="text-sm"
            style={{
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '16.94px',
              color: '#000000',
              width: '755px'
            }}
          >
            Click 'Create' to connect your device. You will need to run a command on your device to complete the connection.
          </p>
        </CardContent>
      </Card>

      {/* 设备信息列表  */}
      <div className="space-y-6" style={{ marginTop: '24px' }}>
        {/* Device ID */}
        <div className="space-y-2">
          <h3 className="font-semibold text-black" style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '19.36px',
            width: '480px'
          }}>
            Device ID
          </h3>
          <div
            className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 w-full"
            style={{
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              padding: '10px'
            }}
          >
            <span
              className="font-normal text-black"
              style={{
                fontFamily: 'Inter',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '18.15px'
              }}
            >
              {deviceId}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(deviceId)}
              className="flex items-center gap-1.5 px-2 py-1 border rounded-lg"
              style={{
                borderColor: '#D5D5D5',
                borderWidth: '1px',
                borderRadius: '8px',
                padding: '4px 8px',
                width: '67px',
                height: '24px'
              }}
            >
              <Copy className="w-3.5 h-3.5" style={{ width: '14px', height: '14px', strokeWidth: 1 }} />
              <span style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '16.94px'
              }}>
                Copy
              </span>
            </Button>
          </div>
        </div>

        {/* Device Name */}
        <div className="space-y-2">
          <h3 className="font-semibold text-black" style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '19.36px',
            width: '480px'
          }}>
            Device Name
          </h3>
          <div
            className="bg-gray-50 rounded-lg p-2.5"
            style={{
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              padding: '10px',
              width: '1068px',
              height: '40px'
            }}
          >
            <span
              className="font-normal text-black"
              style={{
                fontFamily: 'Inter',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '18.15px'
              }}
            >
              {deviceName}
            </span>
          </div>
        </div>

        {/* Gateway */}
        <div className="space-y-2">
          <h3 className="font-semibold text-black" style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '19.36px',
            width: '480px'
          }}>
            Gateway
          </h3>
          <div
            className="bg-gray-50 rounded-lg p-2.5"
            style={{
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              padding: '10px',
              width: '1068px',
              height: '40px'
            }}
          >
            <span
              className="font-normal text-black"
              style={{
                fontFamily: 'Inter',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '18.15px'
              }}
            >
              {gateway}
            </span>
          </div>
        </div>

        {/* Reward Address */}
        <div className="space-y-2">
          <h3 className="font-semibold text-black" style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '19.36px',
            width: '480px'
          }}>
            Reward Address
          </h3>
          <div
            className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5"
            style={{
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              padding: '10px',
              width: '1068px',
              height: '40px'
            }}
          >
            <span
              className="font-normal text-black"
              style={{
                fontFamily: 'Inter',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '18.15px'
              }}
            >
              {rewardAddress}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(rewardAddress)}
              className="flex items-center gap-1.5 px-2 py-1 border rounded-lg"
              style={{
                borderColor: '#D5D5D5',
                borderWidth: '1px',
                borderRadius: '8px',
                padding: '4px 8px',
                width: '67px',
                height: '24px'
              }}
            >
              <Copy className="w-3.5 h-3.5" style={{ width: '14px', height: '14px', strokeWidth: 1 }} />
              <span style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '16.94px'
              }}>
                Copy
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


/**
 * 设备注册表单组件 
 */
const DeviceRegistrationForm: React.FC<{
  formData: {
    registrationCode: string;
    gatewayAddress: string;
    rewardAddress: string;
  };
  validation: {
    isValid: boolean;
    errors: {
      registrationCode?: string;
      gatewayAddress?: string;
      rewardAddress?: string;
    };
  };
  isLoading: boolean;
  onFormChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}> = ({ formData, validation, isLoading, onFormChange, onSubmit, onCancel }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium text-black" style={{
        fontFamily: 'Inter',
        fontSize: '24px',
        fontWeight: 500,
        lineHeight: '28.8px',
        letterSpacing: '-2%',
        // width: '480px'
      }}>
        Device Registration
      </h2>

      {/* 表单字段  */}
      <div className="space-y-6" style={{ marginTop: '24px' }}>
        {/* Registration Code */}
        <div className="space-y-2">
          <h3 className="font-semibold text-black" style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '19.36px',
            // width: '480px'
          }}>
            Registration Code *
          </h3>
          <div
            className={`bg-gray-50 rounded-lg p-2.5 border ${validation.errors.registrationCode ? 'border-red-500' : 'border-black'}`}
            style={{
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              padding: '10px',
              borderWidth: '1px',
              // width: '1068px',
              height: '40px'
            }}
          >
            <input
              type="text"
              value={formData.registrationCode}
              onChange={(e) => onFormChange('registrationCode', e.target.value.toUpperCase())}
              placeholder="Enter registration code"
              className="w-full bg-transparent border-none outline-none"
              style={{
                fontFamily: 'Inter',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '18.15px',
                color: '#000000'
              }}
            />
          </div>
          {validation.errors.registrationCode && (
            <p className="text-red-500 text-sm">{validation.errors.registrationCode}</p>
          )}
        </div>

        {/* Gateway Address */}
        <div className="space-y-2">
          <h3 className="font-semibold text-black" style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '19.36px',
            // width: '480px'
          }}>
            Gateway Address *
          </h3>
          <div
            className={`bg-gray-50 rounded-lg p-2.5 border ${validation.errors.gatewayAddress ? 'border-red-500' : 'border-black'}`}
            style={{
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              padding: '10px',
              borderWidth: '1px',
              // width: '1068px',
              height: '40px'
            }}
          >
            <input
              type="text"
              value={formData.gatewayAddress}
              onChange={(e) => onFormChange('gatewayAddress', e.target.value)}
              placeholder="Enter gateway address"
              className="w-full bg-transparent border-none outline-none"
              style={{
                fontFamily: 'Inter',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '18.15px',
                color: '#000000'
              }}
            />
          </div>
          {validation.errors.gatewayAddress && (
            <p className="text-red-500 text-sm">{validation.errors.gatewayAddress}</p>
          )}
        </div>

        {/* Reward Address */}
        <div className="space-y-2">
          <h3 className="font-semibold text-black" style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '19.36px',
            // width: '480px'
          }}>
            Reward Address *
          </h3>
          <div
            className={`bg-gray-50 rounded-lg p-2.5 border ${validation.errors.rewardAddress ? 'border-red-500' : 'border-black'}`}
            style={{
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              padding: '10px',
              borderWidth: '1px',
              // width: '1068px',
              height: '40px'
            }}
          >
            <input
              type="text"
              value={formData.rewardAddress}
              onChange={(e) => onFormChange('rewardAddress', e.target.value)}
              placeholder="Enter reward address"
              className="w-full bg-transparent border-none outline-none"
              style={{
                fontFamily: 'Inter',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '18.15px',
                color: '#000000'
              }}
            />
          </div>
          {validation.errors.rewardAddress && (
            <p className="text-red-500 text-sm">{validation.errors.rewardAddress}</p>
          )}
        </div>
      </div>

      {/* 按钮组  */}
      <div className="flex justify-end" style={{ marginTop: '24px' }}>
        <div className="flex gap-4" style={{ width: '240px' }}>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-3 py-3 rounded-lg"
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: '8px',
              padding: '12px',
              width: '112px',
              height: '48px'
            }}
          >
            <span style={{
              fontFamily: 'Inter',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '16px',
              color: '#303030'
            }}>
              Cancel
            </span>
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isLoading || !validation.isValid}
            className="flex-1 px-3 py-3 rounded-lg"
            style={{
              backgroundColor: '#2C2C2C',
              borderColor: '#2C2C2C',
              borderWidth: '1px',
              borderRadius: '8px',
              padding: '12px',
              width: '112px',
              height: '48px'
            }}
          >
            <span style={{
              fontFamily: 'Inter',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '16px',
              color: '#F5F5F5'
            }}>
              {isLoading ? 'Registering...' : 'Register'}
            </span>
          </Button>
        </div>
      </div>

      {/* 注意事项 */}
      <Card 
        className="border rounded-lg p-4"
        style={{
          backgroundColor: '#FFFBE6',
          borderColor: '#FFD666',
          borderWidth: '1px',
          borderRadius: '8px',
          padding: '8px 16px'
        }}
      >
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle 
              className="w-6 h-6" 
              style={{ 
                width: '24px', 
                height: '24px',
                color: '#FFC53D'
              }} 
            />
            <span 
              className="font-semibold"
              style={{
                fontFamily: 'Inter',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '19.36px',
                color: '#FAAD14'
              }}
            >
              Note
            </span>
          </div>
          <div 
            className="text-sm space-y-1"
            style={{
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '16.94px',
              color: '#000000'
            }}
          >
            <p>• Registration code is provided by the gateway administrator</p>
            <p>• Gateway address determines which network environment you connect to</p>
            <p>• Reward address is where your earnings will be sent (must be a valid wallet address)</p>
            <p>• Make sure all information is correct before registering</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * 主Device Registration组件 - 遵循依赖倒置原则
 */
export const DeviceRegistration: React.FC<DeviceRegistrationProps> = ({ backendStatus }) => {
  // 使用专用Device Registration Hook获取数据 - 依赖倒置原则
  const { data, loading, registerDevice, validateForm, copyToClipboard, resetForm, refresh, getRegistrationInfo } = useDeviceRegistration(backendStatus);

  // 本地表单状态
  const [formData, setFormData] = useState({
    registrationCode: '',
    gatewayAddress: '',
    rewardAddress: ''
  });

  // 表单验证状态
  const [validation, setValidation] = useState({
    isValid: false,
    errors: {}
  });

  // 复制成功状态
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // 注册成功状态
  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);

  // 注册信息状态
  const [registrationInfo, setRegistrationInfo] = useState<any>({
    deviceId: '',
    deviceName: '',
    gatewayAddress: '',
    rewardAddress: '',
    code: ''
  });
  const [registrationInfoLoading, setRegistrationInfoLoading] = useState(false);

  // 获取注册信息
  const handleGetRegistrationInfo = useCallback(async () => {
    if (!getRegistrationInfo) return;

    setRegistrationInfoLoading(true);
    try {
      const result = await getRegistrationInfo();
      if(result.success) {
        setRegistrationInfo(result.data);
        setFormData({...result.data, registrationCode: result.data.code});
      }
      console.log('Registration info loaded:', result);
    } catch (error) {
      console.error('Failed to get registration info:', error);
      setRegistrationInfo(null);
    } finally {
      setRegistrationInfoLoading(false);
    }
  }, []);

  // 组件初始化时获取注册信息
  useEffect(() => {
    handleGetRegistrationInfo();
  }, []);

  // 表单字段变化处理
  const handleFormChange = useCallback((field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // 实时验证
    const newValidation = validateForm(newFormData);
    setValidation(newValidation);
  }, [formData, validateForm]);

  // 监听注册状态变化，实现数据回显
  useEffect(() => {
    if (data?.registrationStatus.isCreated) {
      console.log('Device registration status updated:', data.registrationStatus);

      // 如果设备已注册，将注册信息回显到表单中
      if (data.registrationStatus.deviceId) {
        console.log('Updating form with registered device data:', {
          gateway: data.registrationStatus.gateway,
          rewardAddress: data.registrationStatus.rewardAddress
        });

        // 更新表单数据以反映已注册的设备信息
        setFormData(prev => ({
          ...prev,
          gatewayAddress: data.registrationStatus.gateway || prev.gatewayAddress,
          rewardAddress: data.registrationStatus.rewardAddress || prev.rewardAddress
        }));
      }
    }
  }, [data?.registrationStatus.isCreated, data?.registrationStatus.deviceId, data?.registrationStatus.gateway, data?.registrationStatus.rewardAddress]);

  // 提交注册
  const handleSubmit = useCallback(async () => {
    try {
      console.log('Starting device registration with form data:', formData);

      const result = await registerDevice(formData);

      // 保存注册成功的结果
      setRegistrationSuccess(result);
      console.log('Registration result saved to state:', result);

      // 注册成功后刷新数据以获取最新状态（触发数据回显）
      console.log('Refreshing data to get updated device status...');
      await refresh();

      // 刷新注册信息
      await handleGetRegistrationInfo();

      // 显示成功消息
      console.log('Registration successful, data refreshed');

      // 清除成功状态（3秒后）
      setTimeout(() => {
        console.log('Clearing registration success notification');
        setRegistrationSuccess(null);
      }, 3000);

      // 注册成功后不重置表单，让用户看到注册状态
      // 表单会根据 data?.registrationStatus.isCreated 状态自动隐藏
      // 数据回显会在useEffect中处理
    } catch (error) {
      console.error('Registration failed:', error);
      // 清除任何之前的成功状态
      setRegistrationSuccess(null);
      // 这里可以显示错误提示
      // 可以添加错误状态管理来显示用户友好的错误消息
    }
  }, [formData, registerDevice, refresh]);

  // 取消操作
  const handleCancel = useCallback(() => {
    resetForm();
    setFormData({
      registrationCode: '',
      gatewayAddress: DEVICE_REGISTRATION_CONSTANTS.DEFAULT_GATEWAY,
      rewardAddress: ''
    });
    setValidation({ isValid: false, errors: {} });
  }, [resetForm]);

  // 复制到剪贴板
  const handleCopy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(text);
      setTimeout(() => setCopySuccess(null), DEVICE_REGISTRATION_CONSTANTS.COPY_SUCCESS_DURATION);
    }
  }, [copyToClipboard]);

  // 错误状态处理
  if (loading.error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Failed to load device registration data</h3>
            <p className="text-sm text-red-600 mt-1">{loading.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-lg w-full max-w-7xl mx-auto sm:p-6 lg:p-8"
      style={{
        borderRadius: '16px',
        padding: '16px 12px',
        boxShadow: '0px 0px 42.4px 7px rgba(237, 237, 237, 1)',
        minHeight: 'auto'
      }}
    >
      {/* Device Registration Status - 按照Figma位置 */}
      {data?.registrationStatus.isCreated && (
        <div className="responsive-container space-y-6 lg:space-y-8">
          <DeviceRegistrationStatus
            isCreated={data.registrationStatus.isCreated}
            deviceId={registrationInfo.deviceId}
            deviceName={registrationInfo.deviceName}
            gateway={registrationInfo.gatewayAddress}
            rewardAddress={registrationInfo.rewardAddress}
            message={registrationInfo.message}
            onCopy={handleCopy}
          />
        </div>
      )}

      {/* 注册成功提示 */}
      {registrationSuccess && (
        <div className="responsive-container">
          <div className="bg-green-100 border border-green-300 rounded-lg p-4 w-full" style={{
            borderColor: '#ABDE9E',
            borderWidth: '1px',
            borderRadius: '8px',
            padding: '12px 16px',
            backgroundColor: '#E8FAEB'
          }}>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="text-sm font-medium text-green-800">
                  Registration Successful!
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  {registrationSuccess.message || 'Device has been registered successfully.'}
                </p>
                {registrationSuccess.deviceId && (
                  <p className="text-xs text-green-600 mt-1 font-mono">
                    Device ID: {registrationSuccess.deviceId}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Registration Form - 按照Figma位置 */}
      <div className="responsive-container space-y-6 lg:space-y-8 mt-6">
        <DeviceRegistrationForm
          formData={formData}
          validation={validation}
          isLoading={loading.isLoading}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>

      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};
