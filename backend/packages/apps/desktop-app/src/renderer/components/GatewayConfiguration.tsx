import React, { useState } from 'react';
import { Globe, Shield, Settings, Save, RefreshCw } from 'lucide-react';

interface GatewayConfig {
  endpoint: string;
  port: number;
  protocol: 'http' | 'https';
  authentication: boolean;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

export const GatewayConfiguration: React.FC = () => {
  const [config, setConfig] = useState<GatewayConfig>({
    endpoint: 'api.sight.ai',
    port: 443,
    protocol: 'https',
    authentication: true,
    apiKey: '',
    timeout: 30,
    retryAttempts: 3
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  const handleConfigChange = (field: keyof GatewayConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveConfig = () => {
    // 保存配置逻辑
    console.log('Saving gateway configuration:', config);
    alert('配置已保存');
  };

  const handleTestConnection = async () => {
    setIsConnecting(true);
    try {
      // 模拟连接测试
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '已连接';
      case 'error': return '连接失败';
      default: return '未连接';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gateway Configuration</h1>
            <p className="text-gray-600 mt-1">配置网关连接和通信参数</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            <button
              onClick={handleTestConnection}
              disabled={isConnecting}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isConnecting ? 'animate-spin' : ''}`} />
              测试连接
            </button>
          </div>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Globe className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">连接设置</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              网关端点
            </label>
            <input
              type="text"
              value={config.endpoint}
              onChange={(e) => handleConfigChange('endpoint', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="api.sight.ai"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              端口
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="443"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              协议
            </label>
            <select
              value={config.protocol}
              onChange={(e) => handleConfigChange('protocol', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="https">HTTPS</option>
              <option value="http">HTTP</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              超时时间 (秒)
            </label>
            <input
              type="number"
              value={config.timeout}
              onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="30"
            />
          </div>
        </div>
      </div>

      {/* Authentication Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Shield className="h-5 w-5 text-green-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">认证设置</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="authentication"
              checked={config.authentication}
              onChange={(e) => handleConfigChange('authentication', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="authentication" className="ml-2 text-sm text-gray-700">
              启用API认证
            </label>
          </div>
          
          {config.authentication && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API密钥
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="输入API密钥"
              />
            </div>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Settings className="h-5 w-5 text-purple-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">高级设置</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              重试次数
            </label>
            <input
              type="number"
              value={config.retryAttempts}
              onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="0"
              max="10"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              连接池大小
            </label>
            <input
              type="number"
              defaultValue={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="1"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">连接状态</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">当前状态:</span>
            <span className={`font-medium ${
              connectionStatus === 'connected' ? 'text-green-600' :
              connectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {getStatusText()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">最后连接:</span>
            <span className="text-gray-900">2024-01-15 14:30:25</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">延迟:</span>
            <span className="text-gray-900">45ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">数据传输:</span>
            <span className="text-gray-900">↑ 1.2MB ↓ 3.4MB</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveConfig}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
        >
          <Save className="h-4 w-4" />
          保存配置
        </button>
      </div>
    </div>
  );
};
