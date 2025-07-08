import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Brain, 
  Cpu, 
  Zap, 
  Settings, 
  Play, 
  Square, 
  RotateCcw,
  Monitor,
  HardDrive,
  Thermometer,
  Activity
} from 'lucide-react';

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface CyberModelInferenceProps {
  backendStatus: BackendStatus;
}

interface InferenceFramework {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  version: string;
  models: number;
  memoryUsage: number;
  gpuUsage: number;
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

interface ModelInfo {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

interface VllmConfig {
  model: string;
  gpu_memory_utilization: number;
  max_model_len: number;
  tensor_parallel_size: number;
  dtype: string;
  quantization?: string;
}

interface FrameworkStatus {
  type: 'ollama' | 'vllm' | null;
  available: boolean;
  version?: string;
  models: string[];
}

export const CyberModelInference: React.FC<CyberModelInferenceProps> = ({ backendStatus }) => {
  const [frameworks, setFrameworks] = useState<InferenceFramework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState('ollama');
  const [gpuInfo, setGpuInfo] = useState<GPUInfo>({
    name: 'Unknown GPU',
    memory: {
      total: 0,
      used: 0,
      free: 0
    },
    temperature: 0,
    utilization: 0
  });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [vllmConfig, setVllmConfig] = useState<VllmConfig | null>(null);
  const [currentFrameworkMonitoring, setCurrentFrameworkMonitoring] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Fetch framework status with real monitoring data
  const fetchFrameworkStatus = async () => {
    if (!backendStatus.isRunning) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('checking');
    try {
      // Get basic framework status
      const statusResponse = await fetch(`http://localhost:${backendStatus.port}/api/app/status`);
      let basicFramework = null;

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.success && statusData.data.framework) {
          basicFramework = statusData.data.framework;
        }
      }

      // Fetch detailed monitoring data for both frameworks
      const [ollamaMonitoring, vllmMonitoring] = await Promise.allSettled([
        fetch(`http://localhost:${backendStatus.port}/api/v1/models/ollama/monitoring`).then(res => res.ok ? res.json() : null),
        fetch(`http://localhost:${backendStatus.port}/api/v1/models/vllm/monitoring`).then(res => res.ok ? res.json() : null)
      ]);

      const ollamaData = ollamaMonitoring.status === 'fulfilled' && ollamaMonitoring.value?.success ? ollamaMonitoring.value.monitoring : null;
      const vllmData = vllmMonitoring.status === 'fulfilled' && vllmMonitoring.value?.success ? vllmMonitoring.value.monitoring : null;

      // Get current framework info
      const ollamaResponse = ollamaMonitoring.status === 'fulfilled' ? ollamaMonitoring.value : null;
      const vllmResponse = vllmMonitoring.status === 'fulfilled' ? vllmMonitoring.value : null;

      // Update frameworks with real monitoring data
      const updatedFrameworks: InferenceFramework[] = [
        {
          id: 'ollama',
          name: 'Ollama',
          status: (ollamaResponse?.isActive && ollamaData?.service?.status === 'running') ? 'active' :
                  (basicFramework?.type === 'ollama' && basicFramework?.available ? 'active' : 'inactive'),
          version: ollamaData?.service?.version || basicFramework?.version || '0.1.26',
          models: ollamaData?.models?.total || (basicFramework?.type === 'ollama' ? basicFramework.models.length : 0),
          memoryUsage: ollamaData?.resources?.memory ? ollamaData.resources.memory.used : 0,
          gpuUsage: ollamaData?.resources?.gpu ? ollamaData.resources.gpu.utilization : 0
        },
        {
          id: 'vllm',
          name: 'vLLM',
          status: (vllmResponse?.isActive && vllmData?.service?.status === 'running') ? 'active' :
                  (basicFramework?.type === 'vllm' && basicFramework?.available ? 'active' : 'inactive'),
          version: basicFramework?.version || '0.3.2',
          models: vllmData?.models?.total || (basicFramework?.type === 'vllm' ? basicFramework.models.length : 0),
          memoryUsage: vllmData?.resources?.memory ? vllmData.resources.memory.used : 0,
          gpuUsage: vllmData?.resources?.gpu ? vllmData.resources.gpu.utilization : 0
        }
      ];

      setFrameworks(updatedFrameworks);
      if (basicFramework?.type) {
        setSelectedFramework(basicFramework.type);
      }
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to fetch framework status:', error);
      // Fallback to basic status without monitoring data
      try {
        const response = await fetch(`http://localhost:${backendStatus.port}/api/app/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.framework) {
            const framework = data.data.framework;
            const updatedFrameworks: InferenceFramework[] = [
              {
                id: 'ollama',
                name: 'Ollama',
                status: framework.type === 'ollama' && framework.available ? 'active' : 'inactive',
                version: framework.version || '0.1.26',
                models: framework.type === 'ollama' ? framework.models.length : 0,
                memoryUsage: 0,
                gpuUsage: 0
              },
              {
                id: 'vllm',
                name: 'vLLM',
                status: framework.type === 'vllm' && framework.available ? 'active' : 'inactive',
                version: framework.version || '0.3.2',
                models: framework.type === 'vllm' ? framework.models.length : 0,
                memoryUsage: 0,
                gpuUsage: 0
              }
            ];
            setFrameworks(updatedFrameworks);
            if (framework.type) {
              setSelectedFramework(framework.type);
            }
          }
        }
      } catch (fallbackError) {
        console.error('Failed to fetch basic framework status:', fallbackError);
        setConnectionStatus('disconnected');
      }
    }
  };

  // Fetch models list
  const fetchModels = async () => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/models/list`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setModels(data.data.models || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

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

  // Fetch vLLM configuration
  const fetchVllmConfig = async () => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/models/vllm/config`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setVllmConfig(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch vLLM config:', error);
    }
  };

  // Fetch detailed monitoring for current framework
  const fetchCurrentFrameworkMonitoring = async () => {
    if (!backendStatus.isRunning || !selectedFramework) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/models/${selectedFramework}/monitoring`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentFrameworkMonitoring(data.monitoring);
        }
      }
    } catch (error) {
      console.error('Failed to fetch current framework monitoring:', error);
      setCurrentFrameworkMonitoring(null);
    }
  };

  // Real-time data updates
  useEffect(() => {
    if (!backendStatus.isRunning) return;

    // Initial fetch
    fetchFrameworkStatus();
    fetchModels();
    fetchSystemResources();
    fetchVllmConfig();
    fetchCurrentFrameworkMonitoring();

    // Set up intervals for real-time updates
    const statusInterval = setInterval(fetchFrameworkStatus, 10000);
    const modelsInterval = setInterval(fetchModels, 30000);
    const resourcesInterval = setInterval(fetchSystemResources, 5000);
    const configInterval = setInterval(fetchVllmConfig, 60000);
    const monitoringInterval = setInterval(fetchCurrentFrameworkMonitoring, 5000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(modelsInterval);
      clearInterval(resourcesInterval);
      clearInterval(configInterval);
      clearInterval(monitoringInterval);
    };
  }, [backendStatus, selectedFramework]);



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />;
      case 'inactive': return <Square className="h-3 w-3" />;
      case 'error': return <Activity className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getHealthCheckIcon = (status: 'pass' | 'fail') => {
    return status === 'pass' ?
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> :
      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />;
  };

  const renderHealthChecks = (framework: InferenceFramework) => {
    if (selectedFramework !== framework.id || !currentFrameworkMonitoring?.health?.checks) {
      return null;
    }

    return (
      <div className="mt-3 p-3 bg-black/20 rounded border border-cyan-400/20">
        <div className="text-xs font-mono text-cyan-400 mb-2">HEALTH CHECKS</div>
        <div className="space-y-1">
          {currentFrameworkMonitoring.health.checks.map((check: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                {getHealthCheckIcon(check.status)}
                <span className="text-muted-foreground">{check.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                {check.responseTime && (
                  <span className="text-yellow-400">{check.responseTime}ms</span>
                )}
                <span className={check.status === 'pass' ? 'text-green-400' : 'text-red-400'}>
                  {check.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-2">
          Last Check: {new Date(currentFrameworkMonitoring.health.lastCheck).toLocaleTimeString()}
        </div>
      </div>
    );
  };

  // Handle framework switching
  const handleFrameworkSwitch = async (targetFramework: 'ollama' | 'vllm') => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/app/switch-framework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          framework: targetFramework,
          validateAvailability: true,
          stopOthers: true,
          restartRequired: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedFramework(targetFramework);
          // Refresh framework status after switching
          setTimeout(fetchFrameworkStatus, 2000);
          console.log(`Successfully switched to ${targetFramework}`);
        } else {
          console.error(`Failed to switch to ${targetFramework}:`, data.message);
        }
      }
    } catch (error) {
      console.error(`Failed to switch to ${targetFramework}:`, error);
    }
  };

  // Handle service restart
  const handleServiceRestart = async (framework: string) => {
    if (!backendStatus.isRunning) return;

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/models/${framework}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh status after restart
          setTimeout(fetchFrameworkStatus, 2000);
        }
      }
    } catch (error) {
      console.error(`Failed to restart ${framework}:`, error);
    }
  };





  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-magenta-500 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">INFERENCE ENGINE</h1>
              <p className="text-cyan-400/80 font-mono text-sm">Neural Network Configuration</p>
            </div>
          </div>

          {/* Global Health Status */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-mono text-muted-foreground">Connection</div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                  connectionStatus === 'checking' ? 'bg-yellow-400 animate-spin' :
                  'bg-red-400 animate-pulse'
                }`} />
                <span className={`text-sm font-mono ${
                  connectionStatus === 'connected' ? 'text-green-400' :
                  connectionStatus === 'checking' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {connectionStatus.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-mono text-muted-foreground">System Status</div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  backendStatus.isRunning ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span className={`text-sm font-mono ${
                  backendStatus.isRunning ? 'text-green-400' : 'text-red-400'
                }`}>
                  {backendStatus.isRunning ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>

            {selectedFramework && currentFrameworkMonitoring && (
              <div className="text-right">
                <div className="text-sm font-mono text-muted-foreground">Active Framework</div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    currentFrameworkMonitoring.service?.status === 'running' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className={`text-sm font-mono ${
                    currentFrameworkMonitoring.service?.status === 'running' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {selectedFramework.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GPU Status */}
      <div className="cyber-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Monitor className="h-5 w-5 text-green-400" />
          <h3 className="text-lg font-bold text-green-400 font-mono">GPU STATUS</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400 font-mono">{gpuInfo.name}</div>
            <div className="text-xs text-muted-foreground font-mono">GRAPHICS PROCESSOR</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-cyan-400 font-mono">
              {currentFrameworkMonitoring?.resources?.gpu ?
                `${(currentFrameworkMonitoring.resources.gpu.memoryUsed / 1024).toFixed(1)}GB` :
                `${(gpuInfo.memory.used / 1024).toFixed(1)}GB`
              }
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              MEMORY USED / {currentFrameworkMonitoring?.resources?.gpu ?
                `${(currentFrameworkMonitoring.resources.gpu.memoryTotal / 1024).toFixed(0)}GB` :
                `${(gpuInfo.memory.total / 1024).toFixed(0)}GB`
              }
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400 font-mono">{gpuInfo.temperature}°C</div>
            <div className="text-xs text-muted-foreground font-mono">TEMPERATURE</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-magenta-400 font-mono">
              {currentFrameworkMonitoring?.resources?.gpu ?
                `${currentFrameworkMonitoring.resources.gpu.utilization.toFixed(0)}%` :
                `${gpuInfo.utilization.toFixed(0)}%`
              }
            </div>
            <div className="text-xs text-muted-foreground font-mono">UTILIZATION</div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm font-mono">
            <span className="text-muted-foreground">Memory Usage</span>
            <span className="text-cyan-400">
              {currentFrameworkMonitoring?.resources?.gpu ?
                `${((currentFrameworkMonitoring.resources.gpu.memoryUsed / currentFrameworkMonitoring.resources.gpu.memoryTotal) * 100).toFixed(1)}%` :
                `${((gpuInfo.memory.used / gpuInfo.memory.total) * 100).toFixed(1)}%`
              }
            </span>
          </div>
          <div className="cyber-progress h-3">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded transition-all duration-500"
              style={{
                width: currentFrameworkMonitoring?.resources?.gpu ?
                  `${(currentFrameworkMonitoring.resources.gpu.memoryUsed / currentFrameworkMonitoring.resources.gpu.memoryTotal) * 100}%` :
                  `${(gpuInfo.memory.used / gpuInfo.memory.total) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Framework Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {frameworks.map((framework) => (
          <div key={framework.id} className="cyber-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-magenta-500 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-cyan-400 font-mono">{framework.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">v{framework.version}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`cyber-badge status-${framework.status} flex items-center space-x-1`}>
                  {getStatusIcon(framework.status)}
                  <span>{framework.status.toUpperCase()}</span>
                </Badge>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-sm font-mono text-muted-foreground">Models Loaded</span>
                <span className="text-sm font-mono text-cyan-400">{framework.models}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-mono text-muted-foreground">Memory Usage</span>
                <span className="text-sm font-mono text-green-400">
                  {framework.memoryUsage > 0 ?
                    `${framework.memoryUsage}${framework.memoryUsage > 1024 ? 'GB' : 'MB'}` :
                    'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-mono text-muted-foreground">GPU Usage</span>
                <span className="text-sm font-mono text-magenta-400">
                  {framework.gpuUsage > 0 ? `${framework.gpuUsage.toFixed(0)}%` : 'N/A'}
                </span>
              </div>
              {selectedFramework === framework.id && currentFrameworkMonitoring && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-mono text-muted-foreground">Response Time</span>
                    <span className="text-sm font-mono text-yellow-400">
                      {currentFrameworkMonitoring.service?.responseTime ?
                        `${currentFrameworkMonitoring.service.responseTime}ms` : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-mono text-muted-foreground">Uptime</span>
                    <span className="text-sm font-mono text-blue-400">
                      {currentFrameworkMonitoring.service?.uptime ?
                        `${Math.floor(currentFrameworkMonitoring.service.uptime / 1000 / 60)}m` : 'N/A'
                      }
                    </span>
                  </div>
                </>
              )}
            </div>

            {renderHealthChecks(framework)}

            <div className="flex space-x-2 mt-3">
              <Button
                onClick={() => handleFrameworkSwitch(framework.id as 'ollama' | 'vllm')}
                className={`cyber-button flex-1 ${
                  framework.status === 'active' ? 'variant-success' : 'variant-secondary'
                }`}
                disabled={!backendStatus.isRunning || framework.status === 'active'}
              >
                {framework.status === 'active' ? 'ACTIVE' : 'SWITCH TO'}
              </Button>
              <Button
                onClick={() => handleServiceRestart(framework.id)}
                className="cyber-button size-icon variant-warning"
                disabled={framework.status !== 'active' || !backendStatus.isRunning}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
