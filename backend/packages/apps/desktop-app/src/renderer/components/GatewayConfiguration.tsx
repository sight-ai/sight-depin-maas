/**
 * Gateway Configuration页面组件 - 严格按照Figma设计实现
 *
 * 遵循SOLID原则：
 * - 单一职责原则：UI组件只负责展示，业务逻辑由Hook处理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：使用专门的Hook接口
 */

import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Copy, AlertCircle } from 'lucide-react';
import { useGatewayConfig, GATEWAY_CONFIG_CONSTANTS } from '../hooks/useGatewayConfig';
import { BackendStatus } from '../hooks/types';

interface GatewayConfigurationProps {
  backendStatus: BackendStatus;
}

/**
 * Connection Status组件 - 按照Figma设计实现
 */
const ConnectionStatus: React.FC<{
  currentGateway: string;
  latency: string;
  registrationCode: string;
  environment: string;
  isLoading: boolean;
  onCopy: (text: string) => Promise<void>;
}> = ({ currentGateway, latency, registrationCode, environment, isLoading, onCopy }) => {
  if (isLoading) {
    return (
      <div 
        className="bg-white rounded-2xl p-6 w-full"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0px 0px 40px 0px rgba(236, 236, 236, 1)'
        }}
      >
        <h2 className="text-black mb-4" style={{
          fontFamily: 'Inter',
          fontSize: '24px',
          fontWeight: 500,
          lineHeight: '28.8px',
          letterSpacing: '-2%'
        }}>
          Connection Status
        </h2>
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-4 bg-gray-200 rounded flex-1"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-2xl p-6 w-full"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0px 0px 40px 0px rgba(236, 236, 236, 1)'
      }}
    >
      <h2 className="text-black mb-4" style={{
        fontFamily: 'Inter',
        fontSize: '24px',
        fontWeight: 500,
        lineHeight: '28.8px',
        letterSpacing: '-2%'
      }}>
        Connection Status
      </h2>
      
      <div className="space-y-4">
        {/* 第一行：Current Gateway 和 Latency */}
        <div className="flex gap-4">
          {/* Current Gateway */}
          <div className="flex-1 space-y-2">
            <h3 className="text-gray-700" style={{
              fontFamily: 'Inter',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '19.36px',
              color: '#333333'
            }}>
              Current Gateway
            </h3>
            <div 
              className="bg-gray-50 rounded-lg p-2.5"
              style={{
                backgroundColor: '#F9F9F9',
                borderRadius: '8px',
                padding: '10px'
              }}
            >
              <span style={{
                fontFamily: 'Menlo',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '17.46px',
                color: '#000000'
              }}>
                {currentGateway}
              </span>
            </div>
          </div>

          {/* Latency */}
          <div className="flex-1 space-y-2">
            <h3 className="text-gray-700" style={{
              fontFamily: 'Inter',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '19.36px',
              color: '#333333'
            }}>
              Latency
            </h3>
            <div 
              className="bg-gray-50 rounded-lg p-2.5"
              style={{
                backgroundColor: '#F9F9F9',
                borderRadius: '8px',
                padding: '10px'
              }}
            >
              <span style={{
                fontFamily: 'Menlo',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '17.46px',
                color: '#000000'
              }}>
                {latency}
              </span>
            </div>
          </div>
        </div>

        {/* 第二行：Registration Code 和 Environment */}
        <div className="flex gap-4">
          {/* Registration Code */}
          <div className="flex-1 space-y-2">
            <h3 className="text-gray-700" style={{
              fontFamily: 'Inter',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '19.36px',
              color: '#333333'
            }}>
              Registration Code
            </h3>
            <div 
              className="bg-gray-50 rounded-lg p-2.5 flex justify-between items-center"
              style={{
                backgroundColor: '#F9F9F9',
                borderRadius: '8px',
                padding: '10px'
              }}
            >
              <span style={{
                fontFamily: 'Menlo',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '17.46px',
                color: '#000000'
              }}>
                {registrationCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(registrationCode)}
                className="flex items-center gap-1.5 px-2 py-1 border rounded-lg"
                style={{
                  borderColor: '#D5D5D5',
                  borderWidth: '1px',
                  borderRadius: '8px',
                  padding: '4px 8px'
                }}
              >
                <Copy className="w-3.5 h-3.5" style={{ width: '14px', height: '14px', strokeWidth: 1 }} />
              </Button>
            </div>
          </div>

          {/* Environment */}
          <div className="flex-1 space-y-2">
            <h3 className="text-gray-700" style={{
              fontFamily: 'Inter',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '19.36px',
              color: '#333333'
            }}>
              Environment
            </h3>
            <div 
              className="bg-gray-50 rounded-lg p-2.5"
              style={{
                backgroundColor: '#F9F9F9',
                borderRadius: '8px',
                padding: '10px'
              }}
            >
              <span style={{
                fontFamily: 'Menlo',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: '17.46px',
                color: '#000000'
              }}>
                {environment}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Gateway Settings组件 - 按照Figma设计实现
 */
const GatewaySettings: React.FC<{
  autoSelectBestGateway: boolean;
  dnsOverride: boolean;
  isLoading: boolean;
  onToggle: (setting: 'autoSelectBestGateway' | 'dnsOverride', value: boolean) => Promise<void>;
}> = ({ autoSelectBestGateway, dnsOverride, isLoading, onToggle }) => {
  return (
    <div className="space-y-6" style={{ width: '1107px' }}>
      <div className="flex justify-between items-center" style={{ gap: '823px' }}>
        <h2 className="text-black" style={{
          fontFamily: 'Inter',
          fontSize: '24px',
          fontWeight: 500,
          lineHeight: '28.8px',
          letterSpacing: '-2%'
        }}>
          Gateway Settings
        </h2>
      </div>
      
      <div className="space-y-3">
        {/* Auto Select Best Gateway */}
        <div 
          className="flex justify-between items-center gap-4 px-2 py-1 rounded-xl"
          style={{
            borderRadius: '12px',
            padding: '4px 8px'
          }}
        >
          <div className="flex flex-col" style={{
            width: '695px',
            height: '45px'
          }}>
            <span style={{
              fontFamily: 'Roboto',
              fontSize: '18px',
              fontWeight: 400,
              lineHeight: '24px',
              letterSpacing: '3.33%',
              color: '#1D1B20'
            }}>
              Auto Select Best Gateway
            </span>
            <span style={{
              fontFamily: 'Roboto',
              fontSize: '15px',
              fontWeight: 400,
              lineHeight: '24px',
              letterSpacing: '4%',
              color: '#878787'
            }}>
              Automatically select optimal gateway based on latency
            </span>
          </div>
          
          <div 
            className="flex items-center justify-center rounded-full cursor-pointer"
            style={{
              backgroundColor: autoSelectBestGateway ? '#6750A4' : '#E0E0E0',
              borderRadius: '100px',
              padding: '2px 4px',
              width: '52px',
              height: '32px',
              transition: 'background-color 0.2s'
            }}
            onClick={() => !isLoading && onToggle('autoSelectBestGateway', !autoSelectBestGateway)}
          >
            <div 
              className="bg-white rounded-full transition-transform duration-200"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '24px',
                transform: autoSelectBestGateway ? 'translateX(10px)' : 'translateX(-10px)'
              }}
            />
          </div>
        </div>

        {/* DNS Override */}
        <div 
          className="flex justify-between items-center gap-4 px-2 py-1 rounded-xl"
          style={{
            borderRadius: '12px',
            padding: '4px 8px'
          }}
        >
          <div className="flex flex-col" style={{
            width: '695px',
            height: '45px'
          }}>
            <span style={{
              fontFamily: 'Roboto',
              fontSize: '18px',
              fontWeight: 400,
              lineHeight: '24px',
              letterSpacing: '3.33%',
              color: '#1D1B20'
            }}>
              DNS Override
            </span>
            <span style={{
              fontFamily: 'Roboto',
              fontSize: '15px',
              fontWeight: 400,
              lineHeight: '24px',
              letterSpacing: '4%',
              color: '#878787'
            }}>
              Use DNS service provided by gateway
            </span>
          </div>
          
          <div 
            className="flex items-center justify-center rounded-full cursor-pointer"
            style={{
              backgroundColor: dnsOverride ? '#6750A4' : '#E0E0E0',
              borderRadius: '100px',
              padding: '2px 4px',
              width: '52px',
              height: '32px',
              transition: 'background-color 0.2s'
            }}
            onClick={() => !isLoading && onToggle('dnsOverride', !dnsOverride)}
          >
            <div 
              className="bg-white rounded-full transition-transform duration-200"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '24px',
                transform: dnsOverride ? 'translateX(10px)' : 'translateX(-10px)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 主Gateway Configuration组件 - 遵循依赖倒置原则
 */
export const GatewayConfiguration: React.FC<GatewayConfigurationProps> = ({ backendStatus }) => {
  // 使用专用Gateway Configuration Hook获取数据 - 依赖倒置原则
  const { data, loading, updateSettings, copyToClipboard } = useGatewayConfig(backendStatus);

  // 复制成功状态
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // 复制到剪贴板
  const handleCopy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(text);
      setTimeout(() => setCopySuccess(null), GATEWAY_CONFIG_CONSTANTS.COPY_SUCCESS_DURATION);
    }
  }, [copyToClipboard]);

  // 切换设置
  const handleToggle = useCallback(async (setting: 'autoSelectBestGateway' | 'dnsOverride', value: boolean) => {
    try {
      await updateSettings({ [setting]: value });
      // 这里可以显示成功提示
    } catch (error) {
      console.error('Update settings failed:', error);
      // 这里可以显示错误提示
    }
  }, [updateSettings]);

  // 错误状态处理
  if (loading.error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Failed to load gateway configuration</h3>
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
      className="bg-white rounded-2xl shadow-lg relative m-3"
      style={{
        width: '1225px',
        height: '1050px',
        borderRadius: '16px',
        boxShadow: '0px 0px 42.4px 7px rgba(237, 237, 237, 1)',
        padding: '27px 26px'
      }}
    >
      <div
        className="flex flex-col items-center gap-12"
        style={{
          gap: '48px',
          width: '1129px'
        }}
      >
        {/* Connection Status */}
        <ConnectionStatus
          currentGateway={data?.connectionStatus.currentGateway || 'gateway.sightai.com'}
          latency={data?.connectionStatus.latency || '23ms'}
          registrationCode={data?.connectionStatus.registrationCode || 'ABC123DEF456'}
          environment={data?.connectionStatus.environment || 'Production'}
          isLoading={loading.isLoading}
          onCopy={handleCopy}
        />

        {/* Gateway Settings */}
        <GatewaySettings
          autoSelectBestGateway={data?.gatewaySettings.autoSelectBestGateway || true}
          dnsOverride={data?.gatewaySettings.dnsOverride || true}
          isLoading={loading.isLoading}
          onToggle={handleToggle}
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
