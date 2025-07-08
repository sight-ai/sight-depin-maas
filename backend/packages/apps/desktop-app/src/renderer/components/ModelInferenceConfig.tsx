import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import {
  Settings,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Save,
  RotateCcw,
  Zap,
  Monitor
} from 'lucide-react';

/**
 * 资源限制配置接口
 */
interface ResourceLimits {
  gpuLimits?: number[];
  memoryLimit?: string;
  cpuCores?: number;
  diskSpace?: string;
}

/**
 * 应用状态接口 - 匹配实际API响应
 */
interface AppStatus {
  isReady: boolean;
  framework: {
    type: 'ollama' | 'vllm';
    available: boolean;
    version?: string;
    models?: string[];
  };
  device: {
    status: string;
    healthy: boolean;
  };
  configuration: {
    valid: boolean;
    errors?: string[];
  };
  resourceUsage?: {
    cpu: {
      usage: number;
      cores: number;
    };
    memory: {
      usage: number;
      total: number;
    };
    gpu?: Array<{
      id: string;
      name: string;
      usage: number;
      memory: {
        used: number;
        total: number;
      };
    }>;
  };
}

interface ModelInferenceConfigProps {
  backendStatus: {
    isRunning: boolean;
    port: number;
  };
}

export const ModelInferenceConfig: React.FC<ModelInferenceConfigProps> = ({ backendStatus }) => {
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('framework');
  const [resourceLimits, setResourceLimitsState] = useState<ResourceLimits>({});

  // 加载状态
  const loadData = async () => {
    if (!backendStatus.isRunning) return;

    try {
      setLoading(true);
      setError(null);

      const statusResponse = await fetch(`http://localhost:${backendStatus.port}/api/app/status`);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAppStatus(statusData.data);
      }
    } catch (error) {
      console.error('Error loading model inference status:', error);
      setError('Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [backendStatus.isRunning, backendStatus.port]);

  // 切换框架
  const switchFramework = async (framework: 'ollama' | 'vllm') => {
    if (!backendStatus.isRunning) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`http://localhost:${backendStatus.port}/api/app/switch-framework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          framework,
          validateAvailability: true,
          stopOthers: true,
          restartRequired: true
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadData();
      } else {
        setError(result.message || 'Failed to switch framework');
      }
    } catch (error) {
      console.error('Error switching framework:', error);
      setError('Failed to switch framework');
    } finally {
      setSaving(false);
    }
  };

  // 设置资源限制
  const updateResourceLimits = async (limits: { gpuIds?: number[]; memoryLimit?: string }) => {
    if (!backendStatus.isRunning || !appStatus?.framework) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`http://localhost:${backendStatus.port}/api/app/resource-limits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          framework: appStatus.framework.type,
          ...limits
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadData();
        // 更新本地状态
        setResourceLimitsState(prev => ({ ...prev, ...limits }));
      } else {
        setError(result.message || 'Failed to set resource limits');
      }
    } catch (error) {
      console.error('Error setting resource limits:', error);
      setError('Failed to set resource limits');
    } finally {
      setSaving(false);
    }
  };

  // 获取框架状态颜色
  const getFrameworkStatusColor = (framework: 'ollama' | 'vllm') => {
    if (!appStatus || !appStatus.framework) return 'bg-gray-100 text-gray-800';

    // 当前框架是否匹配
    const isCurrentFramework = appStatus.framework.type === framework;
    if (!isCurrentFramework) return 'bg-gray-100 text-gray-800';

    if (appStatus.framework.available) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  // 获取框架状态文本
  const getFrameworkStatusText = (framework: 'ollama' | 'vllm') => {
    if (!appStatus || !appStatus.framework) return 'Unknown';

    // 当前框架是否匹配
    const isCurrentFramework = appStatus.framework.type === framework;
    if (!isCurrentFramework) return 'Not Selected';

    if (appStatus.framework.available) return 'Available';
    return 'Not Available';
  };

  if (!backendStatus.isRunning) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Backend service is not running. Please start the service to configure model inference.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="framework">Framework Selection</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="resources">Resource Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="framework" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Model Inference Framework
              </CardTitle>
              <CardDescription>
                Choose between Ollama and vLLM for local model inference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 当前框架状态 */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Current Framework</p>
                  <p className="text-sm text-muted-foreground">
                    {appStatus?.framework?.type ? appStatus.framework.type.toUpperCase() : 'None selected'}
                  </p>
                </div>
                <Badge className={appStatus?.framework?.type ? getFrameworkStatusColor(appStatus.framework.type) : 'bg-gray-100 text-gray-800'}>
                  {appStatus?.framework?.type ? getFrameworkStatusText(appStatus.framework.type) : 'Not configured'}
                </Badge>
              </div>

              {/* 框架选择 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ollama */}
                <Card className={`cursor-pointer transition-all ${appStatus?.framework?.type === 'ollama' ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Ollama</CardTitle>
                      <Badge className={getFrameworkStatusColor('ollama')}>
                        {getFrameworkStatusText('ollama')}
                      </Badge>
                    </div>
                    <CardDescription>
                      Easy-to-use local LLM runner with simple setup
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <p><strong>Pros:</strong> Simple setup, good for beginners</p>
                      <p><strong>Cons:</strong> Limited advanced features</p>
                    </div>
                    <Button
                      onClick={() => switchFramework('ollama')}
                      disabled={saving || appStatus?.framework?.type === 'ollama'}
                      className="w-full"
                      variant={appStatus?.framework?.type === 'ollama' ? 'secondary' : 'default'}
                    >
                      {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                      {appStatus?.framework?.type === 'ollama' ? 'Currently Active' : 'Switch to Ollama'}
                    </Button>
                  </CardContent>
                </Card>

                {/* vLLM */}
                <Card className={`cursor-pointer transition-all ${appStatus?.framework?.type === 'vllm' ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">vLLM</CardTitle>
                      <Badge className={getFrameworkStatusColor('vllm')}>
                        {getFrameworkStatusText('vllm')}
                      </Badge>
                    </div>
                    <CardDescription>
                      High-performance inference engine with advanced features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <p><strong>Pros:</strong> High performance, advanced features</p>
                      <p><strong>Cons:</strong> More complex configuration</p>
                    </div>
                    <Button
                      onClick={() => switchFramework('vllm')}
                      disabled={saving || appStatus?.framework?.type === 'vllm'}
                      className="w-full"
                      variant={appStatus?.framework?.type === 'vllm' ? 'secondary' : 'default'}
                    >
                      {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                      {appStatus?.framework?.type === 'vllm' ? 'Currently Active' : 'Switch to vLLM'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          {appStatus?.framework && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {appStatus.framework.type.toUpperCase()} Configuration
                </CardTitle>
                <CardDescription>
                  Current {appStatus.framework.type} framework configuration and status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 框架状态信息 */}
                <div className="space-y-4">
                  <h4 className="font-medium">Framework Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Framework Type</Label>
                      <div className="p-2 bg-gray-50 rounded border">
                        {appStatus.framework.type.toUpperCase()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="p-2 bg-gray-50 rounded border">
                        <Badge className={getFrameworkStatusColor(appStatus.framework.type)}>
                          {getFrameworkStatusText(appStatus.framework.type)}
                        </Badge>
                      </div>
                    </div>
                    {appStatus.framework.version && (
                      <div className="space-y-2">
                        <Label>Version</Label>
                        <div className="p-2 bg-gray-50 rounded border">
                          {appStatus.framework.version}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Base URL</Label>
                      <div className="p-2 bg-gray-50 rounded border">
                        {appStatus.framework.type === 'ollama' ? 'http://localhost:11434' : 'http://localhost:8000'}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 模型列表 */}
                {appStatus.framework.models && appStatus.framework.models.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Available Models</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {appStatus.framework.models.map((model, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded border text-sm">
                          {model}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 配置说明 */}
                {appStatus.framework.type === 'ollama' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Ollama Configuration</h4>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Ollama is currently configured with default settings.
                        Advanced configuration options can be set through Ollama's configuration files or environment variables.
                      </p>
                      <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                        <li>Default context length: 2048 tokens</li>
                        <li>GPU acceleration: Automatic detection</li>
                        <li>Memory management: Optimized for available resources</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* vLLM 特定配置 */}
                {appStatus.framework.type === 'vllm' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">vLLM Configuration</h4>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-800">
                        <strong>Note:</strong> vLLM is not currently available.
                        Please ensure vLLM is installed and running on port 8000.
                      </p>
                      <ul className="mt-2 text-sm text-orange-700 list-disc list-inside space-y-1">
                        <li>Default port: 8000</li>
                        <li>High-performance inference engine</li>
                        <li>Advanced memory management and optimization</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Configuration is currently read-only. To modify settings, please edit the configuration files directly or use the API.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}

          {!appStatus?.framework && (
            <Card>
              <CardHeader>
                <CardTitle>No Framework Selected</CardTitle>
                <CardDescription>
                  Please select a framework first to view configuration options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab('framework')}>
                  Go to Framework Selection
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Resource Limits
              </CardTitle>
              <CardDescription>
                Configure GPU, memory, and other resource constraints for model inference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 当前资源使用情况 */}
              {appStatus?.resourceUsage && (
                <div className="space-y-4">
                  <h4 className="font-medium">Current Resource Usage</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">CPU</span>
                        </div>
                        <div className="mt-2">
                          <div className="text-2xl font-bold">{appStatus.resourceUsage?.cpu?.usage?.toFixed(1) || '0.0'}%</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${Math.min(appStatus.resourceUsage?.cpu?.usage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Memory</span>
                        </div>
                        <div className="mt-2">
                          <div className="text-2xl font-bold">
                            {appStatus.resourceUsage?.memory ?
                              `${((appStatus.resourceUsage.memory.usage / appStatus.resourceUsage.memory.total) * 100).toFixed(1)}%` :
                              '0.0%'
                            }
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(
                                  appStatus.resourceUsage?.memory ?
                                    (appStatus.resourceUsage.memory.usage / appStatus.resourceUsage.memory.total) * 100 :
                                    0,
                                  100
                                )}%`
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium">GPU</span>
                        </div>
                        <div className="mt-2">
                          {appStatus.resourceUsage.gpu && appStatus.resourceUsage.gpu.length > 0 ? (
                            <div className="space-y-1">
                              {appStatus.resourceUsage.gpu.map((gpu) => (
                                <div key={gpu.id} className="text-xs">
                                  <span>GPU {gpu.id}: {gpu.usage.toFixed(1)}%</span>
                                  <div className="w-full bg-gray-200 rounded-full h-1">
                                    <div
                                      className="bg-purple-500 h-1 rounded-full"
                                      style={{ width: `${Math.min(gpu.usage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No GPU detected</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              <Separator />

              {/* GPU 限制配置 */}
              <ResourceLimitSection
                title="GPU Limits"
                description="Select which GPUs to use for model inference"
                framework={appStatus?.framework?.type}
                onSave={(limits) => updateResourceLimits(limits)}
                saving={saving}
                availableGpus={appStatus?.resourceUsage?.gpu?.map(gpu => parseInt(gpu.id)) || []}
                currentLimits={resourceLimits}
              />

              <Separator />

              {/* 内存限制配置 */}
              <MemoryLimitSection
                title="Memory Limits"
                description="Set memory usage constraints for model inference"
                framework={appStatus?.framework?.type}
                onSave={(limits) => updateResourceLimits(limits)}
                saving={saving}
                currentLimits={resourceLimits}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * GPU 限制配置组件
 */
interface ResourceLimitSectionProps {
  title: string;
  description: string;
  framework: 'ollama' | 'vllm' | null | undefined;
  onSave: (limits: { gpuIds?: number[] }) => void;
  saving: boolean;
  availableGpus: number[];
  currentLimits?: ResourceLimits;
}

const ResourceLimitSection: React.FC<ResourceLimitSectionProps> = ({
  title,
  description,
  framework,
  onSave,
  saving,
  availableGpus,
  currentLimits
}) => {
  const [selectedGpus, setSelectedGpus] = useState<number[]>(currentLimits?.gpuLimits || []);

  const handleGpuToggle = (gpuId: number) => {
    setSelectedGpus(prev =>
      prev.includes(gpuId)
        ? prev.filter(id => id !== gpuId)
        : [...prev, gpuId]
    );
  };

  const handleSave = () => {
    onSave({ gpuIds: selectedGpus });
  };

  if (!framework) {
    return (
      <div className="space-y-4">
        <h4 className="font-medium">{title}</h4>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a framework first to configure resource limits.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {availableGpus.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableGpus.map(gpuId => (
              <div key={gpuId} className="flex items-center space-x-2 p-3 border rounded-lg">
                <Switch
                  id={`gpu-${gpuId}`}
                  checked={selectedGpus.includes(gpuId)}
                  onCheckedChange={() => handleGpuToggle(gpuId)}
                />
                <Label htmlFor={`gpu-${gpuId}`} className="flex-1">
                  GPU {gpuId}
                </Label>
                <Badge variant="outline">
                  {selectedGpus.includes(gpuId) ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Apply GPU Limits
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGpus(currentLimits?.gpuLimits || [])}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {selectedGpus.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Selected GPUs: {selectedGpus.join(', ')}. These GPUs will be used for {framework} inference.
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No GPUs detected on this system. GPU acceleration will not be available.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

/**
 * 内存限制配置组件
 */
interface MemoryLimitSectionProps {
  title: string;
  description: string;
  framework: 'ollama' | 'vllm' | null | undefined;
  onSave: (limits: { memoryLimit?: string }) => void;
  saving: boolean;
  currentLimits?: ResourceLimits;
}

const MemoryLimitSection: React.FC<MemoryLimitSectionProps> = ({
  title,
  description,
  framework,
  onSave,
  saving,
  currentLimits
}) => {
  const [memoryLimit, setMemoryLimit] = useState(currentLimits?.memoryLimit || '');
  const [memoryUnit, setMemoryUnit] = useState<'GB' | 'MB'>('GB');

  const handleSave = () => {
    if (memoryLimit) {
      onSave({ memoryLimit: `${memoryLimit}${memoryUnit}` });
    }
  };

  const handleReset = () => {
    setMemoryLimit(currentLimits?.memoryLimit?.replace(/[A-Za-z]/g, '') || '');
    setMemoryUnit(currentLimits?.memoryLimit?.includes('MB') ? 'MB' : 'GB');
  };

  if (!framework) {
    return (
      <div className="space-y-4">
        <h4 className="font-medium">{title}</h4>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a framework first to configure memory limits.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="memoryLimit">Memory Limit</Label>
            <Input
              id="memoryLimit"
              type="number"
              value={memoryLimit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMemoryLimit(e.target.value)}
              placeholder="8"
              min="1"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="memoryUnit">Unit</Label>
            <Select value={memoryUnit} onValueChange={(value: 'GB' | 'MB') => setMemoryUnit(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GB">GB</SelectItem>
                <SelectItem value="MB">MB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving || !memoryLimit} size="sm">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Apply Memory Limit
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {memoryLimit && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Memory limit will be set to {memoryLimit}{memoryUnit} for {framework} inference.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};
