/**
 * 推理框架选择器组件
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责框架选择UI
 * - 依赖倒置原则：通过props接收框架状态和操作方法
 * - 接口隔离原则：只暴露必要的接口
 */

import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { FrameworkInfo } from '../../hooks/useInferenceFramework';

interface FrameworkSelectorProps {
  currentFramework: FrameworkInfo;
  isLoading: boolean;
  isSwitching: boolean;
  error: string | null;
  onSwitchFramework: (framework: 'ollama' | 'vllm') => Promise<void>;
  onRefresh: () => Promise<void>;
  onClearError: () => void;
}

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  currentFramework,
  isLoading,
  isSwitching,
  error,
  onSwitchFramework,
  onRefresh,
  onClearError
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      {/* 标题和刷新按钮 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-black">Inference Framework</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading || isSwitching}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={onClearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 框架选择器 */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-gray-600">Current Framework:</span>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onSwitchFramework('ollama')}
            disabled={isLoading || isSwitching}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              currentFramework.id === 'ollama'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            } ${(isLoading || isSwitching) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSwitching && currentFramework.id !== 'ollama' ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                <span>Switching...</span>
              </div>
            ) : (
              'Ollama'
            )}
          </button>
          <button
            onClick={() => onSwitchFramework('vllm')}
            disabled={isLoading || isSwitching}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              currentFramework.id === 'vllm'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            } ${(isLoading || isSwitching) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSwitching && currentFramework.id !== 'vllm' ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                <span>Switching...</span>
              </div>
            ) : (
              'vLLM'
            )}
          </button>
        </div>
      </div>

      {/* 框架状态信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{currentFramework.name}</div>
          <div className="text-sm text-gray-600">Framework</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{currentFramework.version}</div>
          <div className="text-sm text-gray-600">Version</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className={`text-lg font-semibold ${
            currentFramework.status === 'Running' ? 'text-green-600' :
            currentFramework.status === 'Stopped' ? 'text-red-600' : 'text-gray-600'
          }`}>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                currentFramework.status === 'Running' ? 'bg-green-500' :
                currentFramework.status === 'Stopped' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
              {currentFramework.status}
            </div>
          </div>
          <div className="text-sm text-gray-600">Status</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{currentFramework.modelsLoaded}</div>
          <div className="text-sm text-gray-600">Models Loaded</div>
        </div>
      </div>

      {/* 资源使用情况 */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-semibold text-blue-900">{currentFramework.memoryUsage}</div>
          <div className="text-sm text-blue-600">Memory Usage</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-900">{currentFramework.gpuUsage}</div>
          <div className="text-sm text-green-600">GPU Usage</div>
        </div>
      </div>
    </div>
  );
};
