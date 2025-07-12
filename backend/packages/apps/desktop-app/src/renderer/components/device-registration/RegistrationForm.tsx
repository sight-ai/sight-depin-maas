/**
 * 设备注册表单组件
 * 处理设备注册的表单输入和提交
 */

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

interface RegistrationFormData {
  code: string;
  gateway: string;
  rewardAddress: string;
}

interface RegistrationFormProps {
  isRegistered: boolean;
  initialData?: Partial<RegistrationFormData>;
  onSubmit: (data: RegistrationFormData) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  isRegistered,
  initialData = {},
  onSubmit,
  isSubmitting = false,
  error
}) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    code: initialData.code || '',
    gateway: initialData.gateway || 'gateway.sightai.com',
    rewardAddress: initialData.rewardAddress || ''
  });

  const [validationErrors, setValidationErrors] = useState<Partial<RegistrationFormData>>({});

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Partial<RegistrationFormData> = {};

    if (!formData.code.trim()) {
      errors.code = 'Registration code is required';
    } else if (formData.code.length < 6) {
      errors.code = 'Registration code must be at least 6 characters';
    }

    if (!formData.gateway.trim()) {
      errors.gateway = 'Gateway is required';
    } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.gateway)) {
      errors.gateway = 'Please enter a valid gateway address';
    }

    if (!formData.rewardAddress.trim()) {
      errors.rewardAddress = 'Reward address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.rewardAddress)) {
      errors.rewardAddress = 'Please enter a valid Ethereum address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof RegistrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的验证错误
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 如果已注册，显示提示信息
  if (isRegistered) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-6">
        <CardContent className="p-0">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Device Already Registered
            </h3>
            <p className="text-gray-600">
              Your device is already registered and active. No further action is required.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <CardContent className="p-0 space-y-6">
        <div>
          <h2 className="text-xl font-medium text-black mb-2">Register Your Device</h2>
          <p className="text-gray-600">
            Complete the form below to register your device and start earning rewards.
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-800">Registration Failed</h4>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Registration Code */}
          <div className="relative">
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.code ? 'border-red-400' : 'border-gray-400'
              }`}
              placeholder="Enter registration code"
              disabled={isSubmitting}
            />
            <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
              Registration Code *
            </div>
            {validationErrors.code && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.code}</p>
            )}
          </div>

          {/* Gateway */}
          <div className="relative">
            <input
              type="text"
              value={formData.gateway}
              onChange={(e) => handleInputChange('gateway', e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.gateway ? 'border-red-400' : 'border-gray-400'
              }`}
              placeholder="gateway.sightai.com"
              disabled={isSubmitting}
            />
            <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
              Gateway *
            </div>
            {validationErrors.gateway && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.gateway}</p>
            )}
          </div>

          {/* Reward Address */}
          <div className="relative">
            <input
              type="text"
              value={formData.rewardAddress}
              onChange={(e) => handleInputChange('rewardAddress', e.target.value)}
              className={`w-full border rounded-lg px-4 py-3 bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.rewardAddress ? 'border-red-400' : 'border-gray-400'
              }`}
              placeholder="0x..."
              disabled={isSubmitting}
            />
            <div className="absolute -top-3 left-4 bg-white px-1.5 text-xs text-gray-600">
              Reward Address *
            </div>
            {validationErrors.rewardAddress && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.rewardAddress}</p>
            )}
          </div>

          {/* 提交按钮 */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering Device...
              </>
            ) : (
              'Register Device'
            )}
          </Button>
        </form>

        {/* 表单说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Registration Information</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Registration Code: Your unique device registration code</li>
            <li>• Gateway: The SightAI gateway server address</li>
            <li>• Reward Address: Your Ethereum wallet address for receiving rewards</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
