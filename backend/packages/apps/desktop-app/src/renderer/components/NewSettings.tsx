import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Network,
  Brain,
  Monitor,
  Palette,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Settings section types
type SettingsSection = 'network' | 'ai-service' | 'system' | 'interface';

interface SettingsSectionConfig {
  id: SettingsSection;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// Settings sections configuration
const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: 'network',
    title: 'Network Configuration',
    description: 'Gateway, registration, and connection settings',
    icon: Network,
    color: 'text-cyan-400'
  },
  {
    id: 'ai-service',
    title: 'AI Service Configuration',
    description: 'Framework selection, GPU limits, and automation',
    icon: Brain,
    color: 'text-magenta-400'
  },
  {
    id: 'system',
    title: 'System Configuration',
    description: 'Application startup, logging, and performance',
    icon: Monitor,
    color: 'text-green-400'
  },
  {
    id: 'interface',
    title: 'Interface Configuration',
    description: 'Theme, language, and display preferences',
    icon: Palette,
    color: 'text-yellow-400'
  }
];

export const NewSettings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('network');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Show message with auto-dismiss
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Settings Navigation Sidebar */}
      <div className="w-80 border-r border-cyan-500/20 bg-black/20 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-cyan-400 font-mono flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            SYSTEM SETTINGS
          </h2>
          <p className="text-sm text-cyan-300/70 font-mono mt-1">
            Configure application behavior and preferences
          </p>
        </div>

        <nav className="space-y-2">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/20'
                    : 'bg-black/20 border-cyan-500/20 hover:border-cyan-500/30 hover:bg-cyan-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-400' : section.color}`} />
                    <div>
                      <div className={`font-medium font-mono text-sm ${
                        isActive ? 'text-cyan-400' : 'text-white'
                      }`}>
                        {section.title}
                      </div>
                      <div className="text-xs text-cyan-300/60 font-mono mt-1">
                        {section.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${
                    isActive ? 'rotate-90 text-cyan-400' : 'text-cyan-300/40'
                  }`} />
                </div>
              </button>
            );
          })}
        </nav>

        {/* Status Message */}
        {message && (
          <div className={`mt-6 p-3 rounded-lg border font-mono text-xs ${
            message.type === 'error'
              ? 'bg-red-500/10 border-red-500/40 text-red-400'
              : 'bg-green-500/10 border-green-500/40 text-green-400'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'error' ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              {message.text}
            </div>
          </div>
        )}
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl">
          {/* Section Header */}
          <div className="mb-6">
            {(() => {
              const section = SETTINGS_SECTIONS.find(s => s.id === activeSection);
              const Icon = section?.icon || SettingsIcon;
              return (
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400/20 to-magenta-500/20 flex items-center justify-center border border-cyan-500/30`}>
                    <Icon className={`h-6 w-6 ${section?.color || 'text-cyan-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-cyan-400 font-mono">
                      {section?.title.toUpperCase() || 'SETTINGS'}
                    </h3>
                    <p className="text-sm text-cyan-300/70 font-mono">
                      {section?.description || 'Configure application settings'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Dynamic Content Based on Active Section */}
          <div className="space-y-6">
            {activeSection === 'network' && <NetworkConfigurationSection showMessage={showMessage} />}
            {activeSection === 'ai-service' && <AIServiceConfigurationSection showMessage={showMessage} />}
            {activeSection === 'system' && <SystemConfigurationSection showMessage={showMessage} />}
            {activeSection === 'interface' && <InterfaceConfigurationSection showMessage={showMessage} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Network Configuration Section Implementation
const NetworkConfigurationSection: React.FC<{ showMessage: (type: 'success' | 'error', text: string) => void }> = ({ showMessage }) => {
  const [gatewayAddress, setGatewayAddress] = useState('https://sightai.io/api/model');
  const [rewardAddress, setRewardAddress] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deviceConfig, setDeviceConfig] = useState<any>(null);
  const [registrationStatus, setRegistrationStatus] = useState<any>({
    status: 'unregistered',
    deviceId: '',
    deviceName: '',
    message: ''
  });

  // Load device config and registration status
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load device config
        if (window.electronAPI) {
          const result = await window.electronAPI.readDeviceConfig();
          if (result.success && result.data) {
            setDeviceConfig(result.data);
            setGatewayAddress(result.data.gatewayAddress);
            setRewardAddress(result.data.rewardAddress);
            setRegistrationCode(result.data.code);
          }
        }

        // Load registration status
        const response = await fetch('http://localhost:8716/api/v1/device-status/gateway-status');
        const data = await response.json();

        if (data.isRegistered) {
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
        console.error('Error loading network configuration:', error);
      }
    };

    loadData();
  }, []);

  const handleSaveNetworkConfig = async () => {
    setIsLoading(true);
    try {
      // Save network configuration logic here
      showMessage('success', 'Network configuration saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save network configuration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Gateway Configuration */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-cyan-400 font-mono mb-4 flex items-center gap-2">
          <Network className="h-5 w-5" />
          GATEWAY CONFIGURATION
        </h4>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-cyan-400 font-mono block mb-2">
              GATEWAY ADDRESS
            </label>
            <input
              type="url"
              value={gatewayAddress}
              onChange={(e) => setGatewayAddress(e.target.value)}
              className="cyber-input w-full font-mono"
              placeholder="https://gateway.sightai.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-cyan-400 font-mono block mb-2">
              REWARD ADDRESS
            </label>
            <input
              type="text"
              value={rewardAddress}
              onChange={(e) => setRewardAddress(e.target.value)}
              className="cyber-input w-full font-mono"
              placeholder="Enter reward receiving address"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-cyan-400 font-mono block mb-2">
              REGISTRATION CODE
            </label>
            <input
              type="text"
              value={registrationCode}
              onChange={(e) => setRegistrationCode(e.target.value)}
              className="cyber-input w-full font-mono"
              placeholder="Enter registration code"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-cyan-400/20">
          <button
            onClick={handleSaveNetworkConfig}
            disabled={isLoading}
            className="cyber-button variant-success flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {isLoading ? 'SAVING...' : 'SAVE CONFIGURATION'}
          </button>
        </div>
      </div>

      {/* Registration Status */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-cyan-400 font-mono mb-4">
          REGISTRATION STATUS
        </h4>

        <div className={`p-4 rounded-lg border font-mono ${
          registrationStatus.status === 'registered'
            ? 'bg-green-500/10 border-green-500/40 text-green-400'
            : 'bg-red-500/10 border-red-500/40 text-red-400'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {registrationStatus.status === 'registered' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="font-medium">
              {registrationStatus.status === 'registered' ? 'REGISTERED' : 'NOT REGISTERED'}
            </span>
          </div>
          <p className="text-xs">{registrationStatus.message}</p>

          {registrationStatus.deviceId && (
            <div className="mt-3 pt-3 border-t border-current/20">
              <div className="text-xs">
                <div>Device ID: {registrationStatus.deviceId}</div>
                {registrationStatus.deviceName && (
                  <div>Device Name: {registrationStatus.deviceName}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AIServiceConfigurationSection: React.FC<{ showMessage: (type: 'success' | 'error', text: string) => void }> = ({ showMessage }) => {
  const [selectedFramework, setSelectedFramework] = useState<'ollama' | 'vllm'>('ollama');
  const [gpuMemoryLimit, setGpuMemoryLimit] = useState<number>(8);
  const [autoStartServices, setAutoStartServices] = useState(false);
  const [autoReportModels, setAutoReportModels] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load AI service configuration
  useEffect(() => {
    const loadAIConfig = async () => {
      try {
        // Load current framework configuration
        const response = await fetch('http://localhost:8716/api/app/config');
        const {data} = await response.json();
        console.log(data)
        if (data) {
          setSelectedFramework(data.clientType);
          setGpuMemoryLimit(data.resourceConfig?.gpuMemoryLimit || 8);
          setAutoStartServices(data.autoStartServices || false);
          setAutoReportModels(data.autoReportModels || false);
        }
      } catch (error) {
        console.error('Error loading AI service configuration:', error);
      }
    };

    loadAIConfig();
  }, []);

  const handleSaveAIConfig = async () => {
    setIsLoading(true);
    try {
      // Save AI service configuration logic here
      const config = {
        clientType: selectedFramework,
        resourceConfig: {
          gpuMemoryLimit
        },
        autoStartServices,
        autoReportModels
      };

      // Prepare framework config according to schema
      const frameworkConfig = selectedFramework === 'ollama' ? {
        framework: 'ollama' as const,
        baseUrl: 'http://localhost:11434',
        timeout: 30000,
        retries: 3,
        enableHealthCheck: true,
        healthCheckInterval: 30000,
        models: [],
        numGpu: gpuMemoryLimit ? Math.floor(gpuMemoryLimit / 4) : undefined,
        lowVram: gpuMemoryLimit ? gpuMemoryLimit < 8 : false
      } : {
        framework: 'vllm' as const,
        baseUrl: 'http://localhost:8000',
        timeout: 30000,
        retries: 3,
        enableHealthCheck: true,
        healthCheckInterval: 30000,
        models: [],
        gpuMemoryUtilization: gpuMemoryLimit ? Math.min(gpuMemoryLimit / 24, 0.9) : 0.8,
        maxModelLen: 4096,
        tensorParallelSize: 1
      };

      // API call to save configuration
      const saveResponse = await fetch('http://localhost:8716/api/app/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frameworkConfig: frameworkConfig,
          clientType: selectedFramework
        }),
      });

      const saveData = await saveResponse.json();

      if (saveData.success) {
        showMessage('success', 'AI service configuration saved successfully');
      } else {
        throw new Error(saveData.message || 'Failed to save configuration');
      }
    } catch (error) {
      showMessage('error', 'Failed to save AI service configuration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Framework Selection */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-magenta-400 font-mono mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          INFERENCE FRAMEWORK
        </h4>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedFramework('ollama')}
              className={`p-4 rounded-lg border font-mono text-left transition-all ${
                selectedFramework === 'ollama'
                  ? 'bg-magenta-500/10 border-magenta-500/40 text-magenta-400'
                  : 'bg-black/20 border-cyan-500/20 text-cyan-300 hover:border-cyan-500/30'
              }`}
            >
              <div className="font-medium">OLLAMA</div>
              <div className="text-xs text-current/70 mt-1">
                Local model inference with Ollama
              </div>
            </button>

            <button
              onClick={() => setSelectedFramework('vllm')}
              className={`p-4 rounded-lg border font-mono text-left transition-all ${
                selectedFramework === 'vllm'
                  ? 'bg-magenta-500/10 border-magenta-500/40 text-magenta-400'
                  : 'bg-black/20 border-cyan-500/20 text-cyan-300 hover:border-cyan-500/30'
              }`}
            >
              <div className="font-medium">vLLM</div>
              <div className="text-xs text-current/70 mt-1">
                High-performance inference with vLLM
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* GPU Memory Configuration */}
      {selectedFramework === 'vllm' && (
        <div className="cyber-card p-6">
          <h4 className="text-lg font-bold text-magenta-400 font-mono mb-4">
            GPU MEMORY LIMITS
          </h4>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-cyan-400 font-mono block mb-2">
                MEMORY LIMIT (GB)
              </label>
              <input
                type="number"
                min="1"
                max="80"
                value={gpuMemoryLimit}
                onChange={(e) => setGpuMemoryLimit(parseInt(e.target.value) || 8)}
                className="cyber-input w-32 font-mono"
                disabled={isLoading}
              />
              <p className="text-xs text-cyan-300/60 font-mono mt-1">
                Maximum GPU memory to allocate for model inference
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Automation */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-magenta-400 font-mono mb-4">
          SERVICE AUTOMATION
        </h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-cyan-400 font-mono">
                AUTO-START SERVICES
              </div>
              <div className="text-xs text-cyan-300/60 font-mono mt-1">
                Automatically start AI services on application launch
              </div>
            </div>
            <label className="cyber-toggle">
              <input
                type="checkbox"
                checked={autoStartServices}
                onChange={(e) => setAutoStartServices(e.target.checked)}
                disabled={isLoading}
              />
              <span className="cyber-toggle-slider"></span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-cyan-400 font-mono">
                AUTO-REPORT MODELS
              </div>
              <div className="text-xs text-cyan-300/60 font-mono mt-1">
                Automatically report new models to gateway
              </div>
            </div>
            <label className="cyber-toggle">
              <input
                type="checkbox"
                checked={autoReportModels}
                onChange={(e) => setAutoReportModels(e.target.checked)}
                disabled={isLoading}
              />
              <span className="cyber-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-cyan-400/20">
          <button
            onClick={handleSaveAIConfig}
            disabled={isLoading}
            className="cyber-button variant-success flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {isLoading ? 'SAVING...' : 'SAVE CONFIGURATION'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SystemConfigurationSection: React.FC<{ showMessage: (type: 'success' | 'error', text: string) => void }> = ({ showMessage }) => {
  const [autoStart, setAutoStart] = useState(false);
  const [logLevel, setLogLevel] = useState<'error' | 'warn' | 'info' | 'debug'>('info');
  const [enableMetrics, setEnableMetrics] = useState(true);
  const [maxLogFiles, setMaxLogFiles] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  // Load system configuration
  useEffect(() => {
    const loadSystemConfig = async () => {
      try {
        // Load auto-start status
        const autoStartStatus = await window.electronAPI?.getAutoStart();
        setAutoStart(autoStartStatus || false);

        // Load app configuration
        const response = await fetch('http://localhost:8716/api/app/config');
        const data = await response.json();

        if (data.success && data.config) {
          setLogLevel(data.config.logLevel || 'info');
          setEnableMetrics(data.config.enableMetrics !== false);
          setMaxLogFiles(data.config.maxLogFiles || 10);
        }
      } catch (error) {
        console.error('Error loading system configuration:', error);
      }
    };

    loadSystemConfig();
  }, []);

  const handleSaveSystemConfig = async () => {
    setIsLoading(true);
    try {
      // Save auto-start setting
      if (window.electronAPI) {
        await window.electronAPI.setAutoStart(autoStart);
      }

      // Save other system configuration
      const config = {
        logLevel,
        enableMetrics,
        maxLogFiles
      };

      // API call to save system configuration
      const saveResponse = await fetch('http://localhost:8716/api/app/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemConfig: {
            logLevel: logLevel,
            maxLogFiles: maxLogFiles
          }
        }),
      });

      const saveData = await saveResponse.json();

      if (saveData.success) {
        showMessage('success', 'System configuration saved successfully');
      } else {
        throw new Error(saveData.message || 'Failed to save system configuration');
      }
    } catch (error) {
      showMessage('error', 'Failed to save system configuration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Application Startup */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-green-400 font-mono mb-4 flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          APPLICATION STARTUP
        </h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-cyan-400 font-mono">
                AUTO-START ON BOOT
              </div>
              <div className="text-xs text-cyan-300/60 font-mono mt-1">
                Automatically start SightAI Desktop when system boots
              </div>
            </div>
            <label className="cyber-toggle">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                disabled={isLoading}
              />
              <span className="cyber-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Logging Configuration */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-green-400 font-mono mb-4">
          LOGGING CONFIGURATION
        </h4>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-cyan-400 font-mono block mb-2">
              LOG LEVEL
            </label>
            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value as any)}
              className="cyber-input w-48 font-mono"
              disabled={isLoading}
            >
              <option value="error">ERROR</option>
              <option value="warn">WARNING</option>
              <option value="info">INFO</option>
              <option value="debug">DEBUG</option>
            </select>
            <p className="text-xs text-cyan-300/60 font-mono mt-1">
              Set the minimum log level for application logging
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-cyan-400 font-mono block mb-2">
              MAX LOG FILES
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={maxLogFiles}
              onChange={(e) => setMaxLogFiles(parseInt(e.target.value) || 10)}
              className="cyber-input w-32 font-mono"
              disabled={isLoading}
            />
            <p className="text-xs text-cyan-300/60 font-mono mt-1">
              Maximum number of log files to retain
            </p>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-green-400 font-mono mb-4">
          PERFORMANCE SETTINGS
        </h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-cyan-400 font-mono">
                ENABLE METRICS COLLECTION
              </div>
              <div className="text-xs text-cyan-300/60 font-mono mt-1">
                Collect performance metrics for monitoring and optimization
              </div>
            </div>
            <label className="cyber-toggle">
              <input
                type="checkbox"
                checked={enableMetrics}
                onChange={(e) => setEnableMetrics(e.target.checked)}
                disabled={isLoading}
              />
              <span className="cyber-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-cyan-400/20">
          <button
            onClick={handleSaveSystemConfig}
            disabled={isLoading}
            className="cyber-button variant-success flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {isLoading ? 'SAVING...' : 'SAVE CONFIGURATION'}
          </button>
        </div>
      </div>
    </div>
  );
};

const InterfaceConfigurationSection: React.FC<{ showMessage: (type: 'success' | 'error', text: string) => void }> = ({ showMessage }) => {
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [displayDensity, setDisplayDensity] = useState<'compact' | 'normal' | 'comfortable'>('normal');
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load interface configuration
  useEffect(() => {
    const loadInterfaceConfig = async () => {
      try {
        // Load interface preferences from localStorage or API
        const savedLanguage = localStorage.getItem('sightai-language') as any || 'en';
        const savedDensity = localStorage.getItem('sightai-density') as any || 'normal';
        const savedAnimations = localStorage.getItem('sightai-animations') !== 'false';

        setLanguage(savedLanguage);
        setDisplayDensity(savedDensity);
        setEnableAnimations(savedAnimations);
      } catch (error) {
        console.error('Error loading interface configuration:', error);
      }
    };

    loadInterfaceConfig();
  }, []);

  const handleSaveInterfaceConfig = async () => {
    setIsLoading(true);
    try {
      // Save interface preferences to localStorage
      localStorage.setItem('sightai-language', language);
      localStorage.setItem('sightai-density', displayDensity);
      localStorage.setItem('sightai-animations', enableAnimations.toString());

      document.documentElement.setAttribute('data-density', displayDensity);
      document.documentElement.setAttribute('data-animations', enableAnimations.toString());

      showMessage('success', 'Interface configuration saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save interface configuration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-yellow-400 font-mono mb-4">
          LANGUAGE SETTINGS
        </h4>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-cyan-400 font-mono block mb-2">
              INTERFACE LANGUAGE
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="cyber-input w-48 font-mono"
              disabled={isLoading}
            >
              <option value="en">ENGLISH</option>
              <option value="zh">中文</option>
            </select>
            <p className="text-xs text-cyan-300/60 font-mono mt-1">
              Select the interface language
            </p>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="cyber-card p-6">
        <h4 className="text-lg font-bold text-yellow-400 font-mono mb-4">
          DISPLAY SETTINGS
        </h4>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-cyan-400 font-mono block mb-2">
              DISPLAY DENSITY
            </label>
            <select
              value={displayDensity}
              onChange={(e) => setDisplayDensity(e.target.value as any)}
              className="cyber-input w-48 font-mono"
              disabled={isLoading}
            >
              <option value="compact">COMPACT</option>
              <option value="normal">NORMAL</option>
              <option value="comfortable">COMFORTABLE</option>
            </select>
            <p className="text-xs text-cyan-300/60 font-mono mt-1">
              Adjust the spacing and size of interface elements
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-cyan-400 font-mono">
                ENABLE ANIMATIONS
              </div>
              <div className="text-xs text-cyan-300/60 font-mono mt-1">
                Enable smooth transitions and animations
              </div>
            </div>
            <label className="cyber-toggle">
              <input
                type="checkbox"
                checked={enableAnimations}
                onChange={(e) => setEnableAnimations(e.target.checked)}
                disabled={isLoading}
              />
              <span className="cyber-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-cyan-400/20">
          <button
            onClick={handleSaveInterfaceConfig}
            disabled={isLoading}
            className="cyber-button variant-success flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {isLoading ? 'SAVING...' : 'SAVE CONFIGURATION'}
          </button>
        </div>
      </div>
    </div>
  );
};
