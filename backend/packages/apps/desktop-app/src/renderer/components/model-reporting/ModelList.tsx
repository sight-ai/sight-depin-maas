/**
 * 模型列表组件
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责模型列表的显示和操作
 * - 依赖倒置原则：通过props接收模型数据和操作方法
 * - 接口隔离原则：只暴露必要的接口
 */

import React from 'react';
import {
  Brain,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card } from '../ui/card';

export interface LocalModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface ModelListProps {
  models: LocalModel[];
  currentFramework: string;
  selectedModels: string[];
  buttonStates: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  isLoading: boolean;
  isReporting: boolean;
  reportingModel: string | null;
  error: string | null;
  onToggleModel: (modelName: string) => void;
  onReportModel: (modelName: string) => Promise<void>;
  onReportAllModels: () => Promise<void>;
  onRefreshModels: () => Promise<void>;
  onClearError: () => void;
}

export const ModelList: React.FC<ModelListProps> = ({
  models,
  currentFramework,
  selectedModels,
  buttonStates,
  isLoading,
  isReporting,
  reportingModel,
  error,
  onToggleModel,
  onReportModel,
  onReportAllModels,
  onRefreshModels,
  onClearError
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getButtonIcon = (modelName: string) => {
    const state = buttonStates[modelName] || 'idle';
    switch (state) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getButtonClass = (modelName: string) => {
    const state = buttonStates[modelName] || 'idle';
    const baseClass = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors";
    
    switch (state) {
      case 'loading':
        return `${baseClass} bg-blue-100 text-blue-700 cursor-not-allowed`;
      case 'success':
        return `${baseClass} bg-green-100 text-green-700`;
      case 'error':
        return `${baseClass} bg-red-100 text-red-700`;
      default:
        return `${baseClass} bg-purple-100 text-purple-700 hover:bg-purple-200`;
    }
  };

  const getButtonText = (modelName: string) => {
    const state = buttonStates[modelName] || 'idle';
    switch (state) {
      case 'loading':
        return 'Reporting...';
      case 'success':
        return 'Reported';
      case 'error':
        return 'Failed';
      default:
        return 'Report';
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-medium text-black">
            Local Models ({currentFramework})
          </h2>
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
            {models.length} models
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onRefreshModels}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <Download className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {selectedModels.length > 0 && (
            <button
              onClick={onReportAllModels}
              disabled={isReporting}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isReporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Report Selected ({selectedModels.length})
            </button>
          )}
        </div>
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

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Loading models...</span>
        </div>
      )}

      {/* 模型列表 */}
      {!isLoading && models.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No models found for {currentFramework}
        </div>
      )}

      {!isLoading && models.length > 0 && (
        <div className="space-y-4">
          {models.map((model) => (
            <div
              key={model.name}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.name)}
                    onChange={() => onToggleModel(model.name)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{model.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span>{formatFileSize(model.size)}</span>
                      <span>{model.details.parameter_size}</span>
                      <span>{model.details.quantization_level}</span>
                      <span>Modified: {formatDate(model.modified_at)}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => onReportModel(model.name)}
                  disabled={buttonStates[model.name] === 'loading' || reportingModel === model.name}
                  className={getButtonClass(model.name)}
                >
                  {getButtonIcon(model.name)}
                  {getButtonText(model.name)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
