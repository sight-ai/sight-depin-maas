import React, { useState, useEffect, useCallback } from 'react';
import { createApiClient, handleApiError } from '../utils/api-client';

// Import icons using require
const ollamaLogo = require('../assets/icons/ollama-logo.png');
const restartIcon = require('../assets/icons/restart-icon.png');
const settingsIcon = require('../assets/icons/settings-icon.png');

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface CyberModelInferenceProps {
  backendStatus: BackendStatus;
}

interface GPUInfo {
  name: string;
  memory: {
    total: number;
    used: number;
    free: number;
  };
  temperature: number;
  utilization: number;
}

interface InferenceFramework {
  id: string;
  name: string;
  version: string;
  status: 'Running' | 'Stopped';
  modelsLoaded: number;
  memoryUsage: string;
  gpuUsage: string;
}

export const CyberModelInference: React.FC<CyberModelInferenceProps> = ({ backendStatus }) => {
  const [selectedMode, setSelectedMode] = useState<'Local Only' | 'Gateway Mode' | 'Benchmark Mode'>('Local Only');
  const [gpuInfo, setGpuInfo] = useState<GPUInfo>({
    name: 'Loading...',
    memory: {
      total: 0,
      used: 0,
      free: 0
    },
    temperature: 0,
    utilization: 0
  });

  const [framework, setFramework] = useState<InferenceFramework>({
    id: 'ollama',
    name: 'Ollama',
    version: 'Loading...',
    status: 'Stopped',
    modelsLoaded: 0,
    memoryUsage: '0 GB',
    gpuUsage: '0%'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 客户端实例
  const apiClient = React.useMemo(() => {
    if (!backendStatus?.isRunning) return null;
    return createApiClient(backendStatus);
  }, [backendStatus?.isRunning, backendStatus?.port]);

  // 🆕 获取系统资源信息
  const fetchSystemResources = useCallback(async () => {
    if (!apiClient) return;

    try {
      const response = await apiClient.getSystemResources();
      if (response.success && response.data) {
        const data = response.data as any;

        // 更新 GPU 信息
        if (data.gpus && data.gpus.length > 0) {
          const gpu = data.gpus[0];
          setGpuInfo({
            name: gpu.name || 'Unknown GPU',
            memory: {
              total: gpu.memory?.total || 0,
              used: gpu.memory?.used || 0,
              free: (gpu.memory?.total || 0) - (gpu.memory?.used || 0)
            },
            temperature: gpu.temperature || 0,
            utilization: gpu.usage || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch system resources:', error);
      setError(handleApiError(error));
    }
  }, [apiClient]);

  // 🆕 获取框架状态
  const fetchFrameworkStatus = useCallback(async () => {
    if (!apiClient) return;

    try {
      // 获取当前框架配置
      const configResponse = await apiClient.getCurrentConfig();
      if (configResponse.success && configResponse.data) {
        const config = configResponse.data as any;
        const currentFramework = config.currentFramework || 'ollama';

        // 根据当前框架获取进程状态
        let processResponse;
        if (currentFramework === 'ollama') {
          processResponse = await apiClient.getOllamaProcessStatus();
        } else if (currentFramework === 'vllm') {
          processResponse = await apiClient.getVllmProcessStatus();
        }

        if (processResponse?.success && processResponse.data) {
          const processData = processResponse.data as any;

          setFramework(prev => ({
            ...prev,
            id: currentFramework,
            name: currentFramework === 'ollama' ? 'Ollama' : 'vLLM',
            version: processData.version || 'Unknown',
            status: processData.running ? 'Running' : 'Stopped',
            modelsLoaded: processData.modelsLoaded || 0,
            memoryUsage: processData.memoryUsage || '0 GB',
            gpuUsage: processData.gpuUsage || '0%'
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch framework status:', error);
      setError(handleApiError(error));
    }
  }, [apiClient]);

  // 🆕 框架切换
  const switchFramework = useCallback(async (targetFramework: 'ollama' | 'vllm') => {
    if (!apiClient) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.switchFramework({ framework: targetFramework });

      if (response.success) {
        // 刷新框架状态
        await fetchFrameworkStatus();
        setError(null);
      } else {
        setError(response.error || 'Failed to switch framework');
      }
    } catch (error) {
      console.error('Failed to switch framework:', error);
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, fetchFrameworkStatus]);

  // 🆕 服务操作处理
  const handleServiceAction = useCallback(async (frameworkId: string, action: string) => {
    console.log(`${action} action for ${frameworkId}`);

    if (action === 'stop') {
      // TODO: 实现停止服务功能
      setError('Stop service feature is not yet implemented');
    } else if (action === 'restart') {
      // TODO: 实现重启服务功能
      setError('Restart service feature is not yet implemented');
    } else if (action === 'settings') {
      // TODO: 打开设置页面
      setError('Settings feature is not yet implemented');
    }
  }, []);

  // 🆕 刷新所有数据
  const refreshAllData = useCallback(async () => {
    if (!apiClient) return;

    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchSystemResources(),
        fetchFrameworkStatus()
      ]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, fetchSystemResources, fetchFrameworkStatus]);

  // 初始化数据
  useEffect(() => {
    if (backendStatus?.isRunning && apiClient) {
      refreshAllData();

      // 定期刷新状态（每30秒）
      const interval = setInterval(() => {
        fetchFrameworkStatus();
        fetchSystemResources();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [backendStatus?.isRunning, apiClient, refreshAllData, fetchFrameworkStatus, fetchSystemResources]);

  return (
    <div
      className="bg-white relative w-full max-w-7xl mx-auto sm:p-6 lg:p-8"
      style={{
        borderRadius: '16px',
        padding: '16px 12px',
        boxShadow: '0px 0px 42.4px 7px rgba(237, 237, 237, 1)',
        minHeight: 'auto'
      }}
    >
      {/* Segmented Control */}
      <div
        className="absolute"
        style={{
          left: '59px',
          top: '44px',
          width: '503px',
          height: '32px'
        }}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: 'rgba(120, 120, 128, 0.12)',
            borderRadius: '9px',
            padding: '2px'
          }}
        >
          {/* Local Only Button - Selected */}
          <div className="relative flex-1 h-full flex items-center justify-center">
            <div
              className="absolute inset-0 bg-white"
              style={{
                borderRadius: '7px',
                border: '0.5px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0px 3px 1px 0px rgba(0, 0, 0, 0.04), 0px 3px 8px 0px rgba(0, 0, 0, 0.12)'
              }}
            />
            <span
              className="relative z-10"
              style={{
                fontFamily: 'SF Pro',
                fontWeight: 590,
                fontSize: '13px',
                lineHeight: '1.385em',
                letterSpacing: '-0.615%',
                color: '#000000'
              }}
            >
              Local Only
            </span>
          </div>

          {/* Separator */}
          <div
            className="bg-gray-400"
            style={{
              width: '1px',
              height: '12px',
              opacity: 0.3,
              borderRadius: '0.5px'
            }}
          />

          {/* Gateway Mode Button */}
          <div className="flex-1 h-full flex items-center justify-center">
            <span
              style={{
                fontFamily: 'SF Pro',
                fontWeight: 400,
                fontSize: '13px',
                lineHeight: '1.385em',
                letterSpacing: '-0.615%',
                color: '#000000'
              }}
            >
              Gateway Mode
            </span>
          </div>

          {/* Separator */}
          <div
            className="bg-gray-400"
            style={{
              width: '1px',
              height: '12px',
              opacity: 0.3,
              borderRadius: '0.5px'
            }}
          />

          {/* Benchmark Mode Button */}
          <div className="flex-1 h-full flex items-center justify-center">
            <span
              style={{
                fontFamily: 'SF Pro',
                fontWeight: 400,
                fontSize: '13px',
                lineHeight: '1.385em',
                letterSpacing: '-0.615%',
                color: '#000000'
              }}
            >
              Benchmark Mode
            </span>
          </div>
        </div>
      </div>

      {/* Reset/Save Buttons */}
      <div
        className="absolute flex gap-4"
        style={{
          right: '32px',
          bottom: '69px',
          width: '240px'
        }}
      >
        {/* Reset Button */}
        <button
          className="flex-1 flex items-center justify-center"
          style={{
            background: '#F7F7F7',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: '16px',
            color: '#303030'
          }}
        >
          Reset
        </button>

        {/* Save Button */}
        <button
          className="flex-1 flex items-center justify-center"
          style={{
            background: '#2C2C2C',
            border: '1px solid #2C2C2C',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: '16px',
            color: '#F5F5F5'
          }}
        >
          Save
        </button>
      </div>

      {/* GPU Status Section */}
      <div
        className="absolute"
        style={{
          left: '61px',
          top: '110px',
          width: '1107px'
        }}
      >
        {/* GPU Status Title */}
        <h2
          style={{
            fontFamily: 'Inter',
            fontWeight: 500,
            fontSize: '24px',
            lineHeight: '1.2em',
            letterSpacing: '-2%',
            color: '#000000',
            marginBottom: '34px'
          }}
        >
          GPU Status
        </h2>

        {/* GPU Status Card */}
        <div
          className="bg-white"
          style={{
            borderRadius: '12px',
            boxShadow: '0px 0px 48.79px 7.53px rgba(234, 234, 234, 1)',
            padding: '28px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}
        >
          {/* GPU Info Row */}
          <div
            className="flex justify-between items-center"
            style={{
              width: '1043px',
              gap: '72px'
            }}
          >
            {/* GPU Name */}
            <div style={{ width: '194px' }}>
              <div
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: '18px',
                  color: '#000000'
                }}
              >
                {gpuInfo.name}
              </div>
            </div>

            {/* GPU Stats */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: '#666666'
                  }}
                >
                  Temperature
                </div>
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: '20px',
                    color: '#000000'
                  }}
                >
                  {gpuInfo.temperature}°C
                </div>
              </div>

              <div className="text-center">
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: '#666666'
                  }}
                >
                  Utilization
                </div>
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: '20px',
                    color: '#000000'
                  }}
                >
                  {gpuInfo.utilization}%
                </div>
              </div>

              <div className="text-center">
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: '#666666'
                  }}
                >
                  Memory
                </div>
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: '20px',
                    color: '#000000'
                  }}
                >
                  {(gpuInfo.memory.used / 1024).toFixed(1)}GB / {(gpuInfo.memory.total / 1024).toFixed(1)}GB
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar Section */}
          <div className="w-full flex flex-col items-end gap-2">
            <div className="flex justify-between items-center w-full">
              <span
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#666666'
                }}
              >
                Memory Usage
              </span>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#000000'
                }}
              >
                {((gpuInfo.memory.used / gpuInfo.memory.total) * 100).toFixed(1)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full flex gap-1.5">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 h-2 rounded-sm"
                  style={{
                    background: i < (gpuInfo.memory.used / gpuInfo.memory.total) * 20
                      ? '#6D20F5'
                      : '#E5E5E5'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Select your interface engine */}
      <div
        className="absolute"
        style={{
          left: '61px',
          top: '401px'
        }}
      >
        <h2
          style={{
            fontFamily: 'Inter',
            fontWeight: 500,
            fontSize: '24px',
            lineHeight: '1.2em',
            letterSpacing: '-2%',
            color: '#000000',
            width: '310px',
            height: '29px'
          }}
        >
          Select your interface engine
        </h2>
      </div>

      {/* Ollama Framework Card */}
      <div
        className="absolute"
        style={{
          left: '61px',
          top: '449px',
          width: '645px',
          height: '381px'
        }}
      >
        {/* Card Background with Gradient Border */}
        <div
          className="relative w-full h-full"
          style={{
            background: 'linear-gradient(135deg, #6D20F5 0%, #E7337A 100%)',
            borderRadius: '16px',
            padding: '2.73px',
            boxShadow: '0px 19.11px 27.3px 0px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Inner Card Content */}
          <div
            className="w-full h-full bg-white relative"
            style={{
              borderRadius: '13.27px',
              overflow: 'hidden'
            }}
          >
            {/* Framework Content */}
            <div
              className="absolute"
              style={{
                left: '49.5px',
                top: '34.5px',
                width: '460.5px'
              }}
            >
              {/* Framework Header */}
              <div className="flex items-end gap-4 mb-4">
                <h3
                  style={{
                    fontFamily: 'Bruno Ace',
                    fontWeight: 400,
                    fontSize: '60.06px',
                    lineHeight: '1.206em',
                    color: '#000000'
                  }}
                >
                  {framework.name}
                </h3>
                <span
                  style={{
                    fontFamily: 'Menlo',
                    fontWeight: 400,
                    fontSize: '21px',
                    lineHeight: '1.164em',
                    color: '#5A5A5A'
                  }}
                >
                  {framework.version}
                </span>
              </div>

              {/* Framework Statistics */}
              <div className="flex flex-col items-end gap-5 mb-4">
                <div className="flex justify-between items-center w-full">
                  <span
                    style={{
                      fontFamily: 'Lato',
                      fontWeight: 400,
                      fontSize: '20px',
                      lineHeight: '1.2em',
                      color: 'rgba(0, 0, 0, 0.55)'
                    }}
                  >
                    Models Loaded
                  </span>
                  <span
                    style={{
                      fontFamily: 'Lato',
                      fontWeight: 400,
                      fontSize: '20px',
                      lineHeight: '1.2em',
                      color: 'rgba(0, 0, 0, 0.55)'
                    }}
                  >
                    {framework.modelsLoaded}
                  </span>
                </div>
                <div className="flex justify-between items-center w-full">
                  <span
                    style={{
                      fontFamily: 'Lato',
                      fontWeight: 400,
                      fontSize: '20px',
                      lineHeight: '1.2em',
                      color: 'rgba(0, 0, 0, 0.55)'
                    }}
                  >
                    Memory Usage
                  </span>
                  <span
                    style={{
                      fontFamily: 'Lato',
                      fontWeight: 400,
                      fontSize: '20px',
                      lineHeight: '1.2em',
                      color: 'rgba(0, 0, 0, 0.55)'
                    }}
                  >
                    {framework.memoryUsage}
                  </span>
                </div>
                <div className="flex justify-between items-center w-full">
                  <span
                    style={{
                      fontFamily: 'Lato',
                      fontWeight: 400,
                      fontSize: '20px',
                      lineHeight: '1.2em',
                      color: 'rgba(0, 0, 0, 0.55)'
                    }}
                  >
                    GPU Usage
                  </span>
                  <span
                    style={{
                      fontFamily: 'Lato',
                      fontWeight: 400,
                      fontSize: '20px',
                      lineHeight: '1.2em',
                      color: 'rgba(0, 0, 0, 0.55)'
                    }}
                  >
                    {framework.gpuUsage}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                {/* Stop Button */}
                <button
                  onClick={() => handleServiceAction(framework.id, 'stop')}
                  className="text-white flex items-center justify-center"
                  style={{
                    width: '291px',
                    height: '39px',
                    background: 'linear-gradient(135deg, #6D20F5 0%, #E7337A 100%)',
                    borderRadius: '11.65px',
                    fontFamily: 'Helvetica',
                    fontSize: '16px',
                    fontWeight: 400,
                    padding: '12px 22.5px 13.53px'
                  }}
                >
                  Stop
                </button>

                {/* Icon Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleServiceAction(framework.id, 'restart')}
                    className="w-14 h-14 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                    style={{
                      borderRadius: '11.65px'
                    }}
                  >
                    <img
                      src={restartIcon}
                      alt="Restart"
                      className="w-6 h-6 object-contain"
                    />
                  </button>
                  <button
                    onClick={() => handleServiceAction(framework.id, 'settings')}
                    className="w-14 h-14 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                    style={{
                      borderRadius: '11.65px'
                    }}
                  >
                    <img
                      src={settingsIcon}
                      alt="Settings"
                      className="w-6 h-6 object-contain"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Avatar/Logo */}
            <div
              className="absolute bg-white rounded-full flex items-center justify-center"
              style={{
                width: '123.4px',
                height: '123.4px',
                right: '0px',
                top: '25.5px',
                boxShadow: '0px 19.11px 27.3px 0px rgba(0, 0, 0, 0.1)'
              }}
            >
              <img
                src={ollamaLogo}
                alt="Ollama Logo"
                className="object-contain"
                style={{
                  width: '56.83px',
                  height: '80.38px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberModelInference;