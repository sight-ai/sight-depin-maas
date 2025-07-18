/**
 * 模型报告主组件
 *
 * 遵循SOLID原则：
 * - 单一职责原则：作为容器组件，协调子组件
 * - 依赖倒置原则：通过Hook获取业务逻辑
 * - 接口隔离原则：只暴露必要的接口
 */

import React from 'react';
import { FrameworkSelector } from './model-reporting/FrameworkSelector';
import { ModelList } from './model-reporting/ModelList';
import { useInferenceFramework } from '../hooks/useInferenceFramework';
import { useModelReporting } from '../hooks/useModelReporting';
import { BackendStatus } from '../hooks/types';

interface ModelReportingProps {
  backendStatus: BackendStatus;
}

export const ModelReporting: React.FC<ModelReportingProps> = ({ backendStatus }) => {
  // 使用推理框架管理Hook
  const {
    currentFramework,
    isLoading: frameworkLoading,
    isSwitching,
    error: frameworkError,
    switchFramework,
    refreshFrameworkStatus,
    clearError: clearFrameworkError
  } = useInferenceFramework(backendStatus);

  // 使用模型报告管理Hook
  const {
    localModels,
    selectedModels,
    buttonStates,
    isLoading: modelsLoading,
    isReporting,
    reportingModel,
    error: modelsError,
    toggleModel,
    reportModel,
    reportAllModels,
    refreshModels,
    clearError: clearModelsError
  } = useModelReporting(backendStatus, currentFramework.id);



  return (
    <div className="bg-white relative w-full max-w-7xl mx-auto sm:p-6 lg:p-8">
      {/* 框架选择器 */}
      <FrameworkSelector
        currentFramework={currentFramework}
        isLoading={frameworkLoading}
        isSwitching={isSwitching}
        error={frameworkError}
        onSwitchFramework={switchFramework}
        onRefresh={refreshFrameworkStatus}
        onClearError={clearFrameworkError}
      />

      {/* 模型列表 */}
      <ModelList
        models={localModels}
        currentFramework={currentFramework.name}
        selectedModels={selectedModels}
        buttonStates={buttonStates}
        isLoading={modelsLoading}
        isReporting={isReporting}
        reportingModel={reportingModel}
        error={modelsError}
        onToggleModel={toggleModel}
        onReportModel={reportModel}
        onReportAllModels={reportAllModels}
        onRefreshModels={() => refreshModels(currentFramework.id)}
        onClearError={clearModelsError}
      />
    </div>
  );
};
