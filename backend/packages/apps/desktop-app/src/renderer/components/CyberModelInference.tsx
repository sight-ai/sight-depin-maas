import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import {
  Settings,
  RotateCcw
} from 'lucide-react';

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
  status: 'Running' | 'Stopped';
  modelsLoaded: number;
  memoryUsage: string;
  gpuUsage: string;
}

export const CyberModelInference: React.FC<CyberModelInferenceProps> = ({ backendStatus }) => {
  const [selectedMode, setSelectedMode] = useState<'Local Only' | 'Gateway Mode' | 'Benchmark Mode'>('Local Only');
  const [gpuInfo, setGpuInfo] = useState<GPUInfo>({
    name: 'NVIDIA GeForce RTX 4090',
    memory: {
      total: 24576,
      used: 8192,
      free: 16384
    },
    temperature: 65,
    utilization: 45
  });
  const [frameworks, setFrameworks] = useState<InferenceFramework[]>([
    {
      id: 'ollama',
      name: 'Ollama',
      status: 'Running',
      modelsLoaded: 3,
      memoryUsage: '2.1 GB',
      gpuUsage: '25%'
    },
    {
      id: 'vllm',
      name: 'vLLM',
      status: 'Stopped',
      modelsLoaded: 0,
      memoryUsage: '0 GB',
      gpuUsage: '0%'
    }
  ]);

  // Fetch system resources for GPU info
  const fetchSystemResources = async () => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/app/system-resources`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.gpus && data.data.gpus.length > 0) {
          const gpu = data.data.gpus[0];
          setGpuInfo({
            name: gpu.name || 'Unknown GPU',
            memory: {
              total: gpu.memory || 0,
              used: Math.round((gpu.memory || 0) * (gpu.usage || 0) / 100),
              free: Math.round((gpu.memory || 0) * (1 - (gpu.usage || 0) / 100))
            },
            temperature: gpu.temperature || 0,
            utilization: gpu.usage || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch system resources:', error);
    }
  };

  // Real-time data updates
  useEffect(() => {
    if (!backendStatus.isRunning) return;

    // Initial fetch
    fetchSystemResources();

    // Set up intervals for real-time updates
    const resourcesInterval = setInterval(fetchSystemResources, 5000);

    return () => {
      clearInterval(resourcesInterval);
    };
  }, [backendStatus]);


  // Handle service actions
  const handleServiceAction = async (frameworkId: string, action: 'stop' | 'restart' | 'settings') => {
    console.log(`${action} ${frameworkId}`);
    // TODO: Implement service actions
  };





  return (
    <div
      className="w-full h-full bg-white"
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Header with Segmented Control */}
      <div className="flex items-center justify-between mb-6">
        {/* Segmented Control */}
        <div
          className="flex bg-gray-100 rounded-lg p-1"
          style={{ width: '412px', height: '48px' }}
        >
          {(['Local Only', 'Gateway Mode', 'Benchmark Mode'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedMode === mode
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
              style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: selectedMode === mode ? 600 : 500
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Reset and Save Buttons */}
        <div className="flex space-x-3">
          <button
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            style={{
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Reset
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800"
            style={{
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Save
          </button>
        </div>
      </div>

      {/* GPU Status Section */}
      <div className="mb-8">
        <h2
          className="text-2xl font-medium mb-8 text-black"
          style={{
            fontFamily: 'Inter',
            fontSize: '24px',
            fontWeight: 500,
            letterSpacing: '-2%',
            lineHeight: '1.2em'
          }}
        >
          GPU Status
        </h2>

        <Card
          className="bg-white border-0"
          style={{
            boxShadow: '0px 0px 48.788509368896484px 7.533780574798584px rgba(234, 234, 234, 1)',
            borderRadius: '12px'
          }}
        >
          <CardContent
            className="flex flex-col items-center"
            style={{
              padding: '28px 20px',
              gap: '20px'
            }}
          >
            {/* GPU Info Grid */}
            <div
              className="flex justify-between items-center"
              style={{
                width: '1043px',
                gap: '72px'
              }}
            >
              {/* GPU Name */}
              <div
                className="flex flex-col"
                style={{ width: '194px' }}
              >
                <div
                  className="text-center text-black"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '24px',
                    fontWeight: 500,
                    letterSpacing: '-2%',
                    lineHeight: '1.2em'
                  }}
                >
                  {gpuInfo.name || 'Unknown GPU'}
                </div>
                <div
                  className="text-center"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '20px',
                    fontWeight: 400,
                    letterSpacing: '-2%',
                    lineHeight: '1.2em',
                    color: '#888888',
                    width: '194px'
                  }}
                >
                  Graphics Processor
                </div>
              </div>

              {/* Memory */}
              <div className="flex flex-col items-center">
                <div
                  className="text-center text-black"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '24px',
                    fontWeight: 500,
                    letterSpacing: '-2%',
                    lineHeight: '1.2em'
                  }}
                >
                  {(gpuInfo.memory.used / 1024).toFixed(2)} GB
                </div>
                <div
                  className="text-center"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '20px',
                    fontWeight: 400,
                    letterSpacing: '-2%',
                    lineHeight: '1.2em',
                    color: '#888888',
                    width: '194px'
                  }}
                >
                  Memory Used/{(gpuInfo.memory.total / 1024).toFixed(0)} GB
                </div>
              </div>

              {/* Temperature */}
              <div className="flex flex-col items-center">
                <div
                  className="text-center text-black"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '24px',
                    fontWeight: 500,
                    letterSpacing: '-2%',
                    lineHeight: '1.2em'
                  }}
                >
                  {gpuInfo.temperature}℃
                </div>
                <div
                  className="text-center"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '20px',
                    fontWeight: 400,
                    letterSpacing: '-2%',
                    lineHeight: '1.2em',
                    color: '#888888',
                    width: '194px'
                  }}
                >
                  Temperature
                </div>
              </div>

              {/* Utilization */}
              <div className="flex flex-col items-center">
                <div
                  className="text-center text-black"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '24px',
                    fontWeight: 500,
                    letterSpacing: '-2%',
                    lineHeight: '1.2em'
                  }}
                >
                  {gpuInfo.utilization.toFixed(0)}%
                </div>
                <div
                  className="text-center"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '20px',
                    fontWeight: 400,
                    letterSpacing: '-2%',
                    lineHeight: '1.2em',
                    color: '#888888',
                    width: '194px'
                  }}
                >
                  Utilization
                </div>
              </div>
            </div>

            {/* Memory Progress Section */}
            <div
              className="flex flex-col items-end w-full"
              style={{ gap: '8px' }}
            >
              {/* Memory Label and Percentage */}
              <div
                className="flex justify-between items-center w-full"
                style={{ gap: '841px' }}
              >
                <span
                  style={{
                    fontFamily: 'Roboto',
                    fontSize: '22px',
                    fontWeight: 400,
                    lineHeight: '1.27em',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}
                >
                  Memory
                </span>
                <span
                  style={{
                    fontFamily: 'Roboto',
                    fontSize: '22px',
                    fontWeight: 400,
                    lineHeight: '1.27em',
                    color: 'rgba(0, 0, 0, 0.85)'
                  }}
                >
                  {((gpuInfo.memory.used / gpuInfo.memory.total) * 100).toFixed(0)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div
                className="w-full relative"
                style={{ height: '12px' }}
              >
                {/* Track */}
                <div
                  className="absolute rounded-sm"
                  style={{
                    left: '349.8px',
                    top: '1.5px',
                    width: '712px',
                    height: '9px',
                    backgroundColor: '#E7E7E7',
                    borderRadius: '2px'
                  }}
                />
                {/* Active Indicator */}
                <div
                  className="absolute"
                  style={{
                    left: '4.25px',
                    top: '1px',
                    width: `${(gpuInfo.memory.used / gpuInfo.memory.total) * 934.02}px`,
                    height: '12px'
                  }}
                >
                  <div
                    className="h-full"
                    style={{
                      background: 'linear-gradient(90deg, #000000 0%, #000000 100%)',
                      borderRadius: '24px'
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inference Framework Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {frameworks.map((framework) => (
          <Card
            key={framework.id}
            className="bg-white border border-gray-200"
            style={{
              boxShadow: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)',
              borderRadius: '12px'
            }}
          >
            <CardContent className="p-6">
              {/* Framework Header */}
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold text-black"
                  style={{
                    fontFamily: 'Bruno Ace',
                    fontSize: '18px',
                    fontWeight: 400
                  }}
                >
                  {framework.name}
                </h3>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    framework.status === 'Running'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  {framework.status}
                </div>
              </div>

              {/* Statistics */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span
                    className="text-sm text-gray-600"
                    style={{
                      fontFamily: 'Lato',
                      fontSize: '14px',
                      fontWeight: 400
                    }}
                  >
                    Models Loaded
                  </span>
                  <span
                    className="text-sm font-medium text-black"
                    style={{
                      fontFamily: 'Lato',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    {framework.modelsLoaded}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-sm text-gray-600"
                    style={{
                      fontFamily: 'Lato',
                      fontSize: '14px',
                      fontWeight: 400
                    }}
                  >
                    Memory Usage
                  </span>
                  <span
                    className="text-sm font-medium text-black"
                    style={{
                      fontFamily: 'Lato',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    {framework.memoryUsage}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-sm text-gray-600"
                    style={{
                      fontFamily: 'Lato',
                      fontSize: '14px',
                      fontWeight: 400
                    }}
                  >
                    GPU Usage
                  </span>
                  <span
                    className="text-sm font-medium text-black"
                    style={{
                      fontFamily: 'Lato',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    {framework.gpuUsage}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleServiceAction(framework.id, 'stop')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Stop
                </button>
                <button
                  onClick={() => handleServiceAction(framework.id, 'restart')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2 inline" />
                  Restart
                </button>
                <button
                  onClick={() => handleServiceAction(framework.id, 'settings')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
