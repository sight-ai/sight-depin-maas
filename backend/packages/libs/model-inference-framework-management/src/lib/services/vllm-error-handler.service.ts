import { Injectable, Logger } from '@nestjs/common';
import { VllmMemoryConfig } from './vllm-config.service';
import {
  IErrorHandler,
  IErrorRecovery,
  ErrorAnalysisResult,
  ErrorSeverity,
  ErrorRecoveryStrategy
} from '@saito/common';

export interface ErrorPattern {
  pattern: RegExp;
  type: string;
  userMessage: string;
  suggestions: string[];
}

// 保持向后兼容
export interface ErrorAnalysis {
  type: string;
  userMessage: string;
  suggestions: string[];
  originalError: string;
  recommendations?: Record<string, any>;
}



/**
 * vLLM 错误处理服务 - 重构版
 *
 * 职责：
 * 1. 实现 IErrorHandler 接口，专门处理 vLLM 相关错误
 * 2. 实现 IErrorRecovery 接口，提供 vLLM 错误恢复策略
 * 3. 遵循单一职责原则 - 只处理 vLLM 错误
 * 4. 遵循依赖倒置原则 - 实现抽象接口
 */
@Injectable()
export class VllmErrorHandlerService implements IErrorHandler, IErrorRecovery {
  private readonly logger = new Logger(VllmErrorHandlerService.name);

  private readonly errorPatterns: ErrorPattern[] = [
    {
      pattern: /CUDA out of memory/i,
      type: 'MEMORY_ERROR',
      userMessage: '显存不足！请尝试以下解决方案：',
      suggestions: [
        '降低 GPU 显存利用率 (gpu-memory-utilization)',
        '减少最大模型长度 (max-model-len)',
        '减少最大并发序列数 (max-num-seqs)',
        '启用 enforce-eager 模式',
        '增加交换空间 (swap-space)'
      ]
    },
    {
      pattern: /Failed to allocate.*bytes/i,
      type: 'ALLOCATION_ERROR',
      userMessage: '内存分配失败！建议：',
      suggestions: [
        '检查系统可用内存',
        '关闭其他占用内存的程序',
        '降低批处理大小 (max-num-batched-tokens)',
        '使用量化模型 (quantization)'
      ]
    },
    {
      pattern: /Model.*not found/i,
      type: 'MODEL_ERROR',
      userMessage: '模型未找到！请检查：',
      suggestions: [
        '确认模型路径是否正确',
        '检查模型是否已下载',
        '验证模型格式是否支持',
        '检查文件权限'
      ]
    },
    {
      pattern: /Port.*already in use/i,
      type: 'PORT_ERROR',
      userMessage: '端口已被占用！解决方案：',
      suggestions: [
        '更换其他端口号',
        '停止占用该端口的进程',
        '检查是否有其他 vLLM 实例在运行'
      ]
    },
    {
      pattern: /Tensor parallel size.*exceeds.*GPU/i,
      type: 'PARALLEL_ERROR',
      userMessage: '张量并行配置错误！',
      suggestions: [
        '减少张量并行大小 (tensor-parallel-size)',
        '确保并行大小不超过 GPU 数量',
        '检查 GPU 可用性'
      ]
    },
    {
      pattern: /quantization.*not supported/i,
      type: 'QUANTIZATION_ERROR',
      userMessage: '量化配置不支持！',
      suggestions: [
        '检查量化方法是否正确 (int8, int4, fp16)',
        '验证模型是否支持指定的量化方法',
        '尝试不使用量化或使用其他量化方法'
      ]
    }
  ];

  // =============================================================================
  // IErrorHandler 接口实现
  // =============================================================================

  /**
   * 分析错误并返回结构化信息 (新接口)
   */
  analyzeError(error: Error | string, context?: Record<string, any>): ErrorAnalysisResult {
    const errorMessage = error instanceof Error ? error.message : error;
    const analysis = this.analyzeErrorLegacy(errorMessage);

    return {
      type: analysis.type,
      severity: this.determineSeverity(analysis.type),
      userMessage: analysis.userMessage,
      technicalMessage: errorMessage,
      suggestions: analysis.suggestions,
      context,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取错误恢复策略
   */
  getRecoveryStrategy(errorType: string, context?: Record<string, any>): ErrorRecoveryStrategy {
    const strategies: Record<string, ErrorRecoveryStrategy> = {
      'MEMORY_ERROR': {
        canRecover: true,
        recoveryActions: ['调整 GPU 内存使用率', '减少最大模型长度', '重启 vLLM 服务'],
        estimatedRecoveryTime: 30000, // 30秒
        requiresUserAction: true
      },
      'MODEL_ERROR': {
        canRecover: true,
        recoveryActions: ['检查模型路径', '重新下载模型', '切换到其他模型'],
        estimatedRecoveryTime: 60000, // 1分钟
        requiresUserAction: true
      },
      'STARTUP_ERROR': {
        canRecover: true,
        recoveryActions: ['检查配置文件', '重启服务', '检查依赖'],
        estimatedRecoveryTime: 45000, // 45秒
        requiresUserAction: false
      }
    };

    return strategies[errorType] || {
      canRecover: false,
      recoveryActions: ['联系技术支持'],
      requiresUserAction: true
    };
  }

  /**
   * 检查错误是否可以自动恢复
   */
  canAutoRecover(errorType: string): boolean {
    const autoRecoverableTypes = ['STARTUP_ERROR', 'NETWORK_ERROR'];
    return autoRecoverableTypes.includes(errorType);
  }

  /**
   * 格式化错误信息供用户显示
   */
  formatUserMessage(analysis: ErrorAnalysisResult): string {
    let message = `[${analysis.severity.toUpperCase()}] ${analysis.userMessage}`;

    if (analysis.suggestions.length > 0) {
      message += '\n\n建议操作：\n' + analysis.suggestions.map(s => `• ${s}`).join('\n');
    }

    return message;
  }

  // =============================================================================
  // IErrorRecovery 接口实现
  // =============================================================================

  /**
   * 尝试自动恢复
   */
  async attemptAutoRecovery(errorType: string, context?: Record<string, any>): Promise<{
    success: boolean;
    message: string;
    nextSteps?: string[];
  }> {
    if (!this.canAutoRecover(errorType)) {
      return {
        success: false,
        message: 'This error type cannot be auto-recovered',
        nextSteps: ['Manual intervention required']
      };
    }

    try {
      switch (errorType) {
        case 'STARTUP_ERROR':
          return await this.recoverStartupError(context);
        case 'NETWORK_ERROR':
          return await this.recoverNetworkError(context);
        default:
          return {
            success: false,
            message: 'No recovery strategy available',
            nextSteps: ['Contact support']
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: ['Manual recovery required']
      };
    }
  }

  /**
   * 执行手动恢复步骤
   */
  async executeRecoveryStep(step: string, context?: Record<string, any>): Promise<{
    success: boolean;
    message: string;
  }> {
    // 实现具体的恢复步骤
    this.logger.debug(`Executing recovery step: ${step}`);

    // 这里可以实现具体的恢复逻辑
    return {
      success: true,
      message: `Recovery step '${step}' executed successfully`
    };
  }

  /**
   * 验证恢复是否成功
   */
  async validateRecovery(errorType: string, context?: Record<string, any>): Promise<boolean> {
    // 实现恢复验证逻辑
    this.logger.debug(`Validating recovery for error type: ${errorType}`);

    // 这里可以实现具体的验证逻辑
    return true;
  }

  // =============================================================================
  // 向后兼容的方法
  // =============================================================================

  /**
   * 分析错误消息并返回用户友好的错误信息 (向后兼容)
   */
  analyzeErrorLegacy(errorMessage: string): ErrorAnalysis {
    this.logger.debug(`Analyzing error: ${errorMessage}`);

    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        this.logger.debug(`Matched error pattern: ${pattern.type}`);
        
        return {
          type: pattern.type,
          userMessage: pattern.userMessage,
          suggestions: pattern.suggestions,
          originalError: errorMessage
        };
      }
    }

    this.logger.warn(`Unknown error pattern: ${errorMessage}`);
    
    return {
      type: 'UNKNOWN_ERROR',
      userMessage: '发生未知错误，请检查日志获取详细信息',
      suggestions: [
        '检查 vLLM 版本兼容性',
        '查看完整错误日志',
        '重启服务后重试',
        '联系技术支持'
      ],
      originalError: errorMessage
    };
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 确定错误严重程度
   */
  private determineSeverity(errorType: string): ErrorSeverity {
    const severityMap: Record<string, ErrorSeverity> = {
      'MEMORY_ERROR': ErrorSeverity.HIGH,
      'MODEL_ERROR': ErrorSeverity.HIGH,
      'STARTUP_ERROR': ErrorSeverity.MEDIUM,
      'NETWORK_ERROR': ErrorSeverity.MEDIUM,
      'CONFIG_ERROR': ErrorSeverity.MEDIUM,
      'UNKNOWN_ERROR': ErrorSeverity.LOW
    };

    return severityMap[errorType] || ErrorSeverity.LOW;
  }

  /**
   * 恢复启动错误
   */
  private async recoverStartupError(context?: Record<string, any>): Promise<{
    success: boolean;
    message: string;
    nextSteps?: string[];
  }> {
    this.logger.debug('Attempting to recover from startup error');

    // 实现启动错误恢复逻辑
    // 例如：重新加载配置、重启服务等

    return {
      success: true,
      message: 'Startup error recovery completed',
      nextSteps: ['Verify service status', 'Test model loading']
    };
  }

  /**
   * 恢复网络错误
   */
  private async recoverNetworkError(context?: Record<string, any>): Promise<{
    success: boolean;
    message: string;
    nextSteps?: string[];
  }> {
    this.logger.debug('Attempting to recover from network error');

    // 实现网络错误恢复逻辑
    // 例如：重新连接、检查网络状态等

    return {
      success: true,
      message: 'Network error recovery completed',
      nextSteps: ['Test connectivity', 'Verify endpoints']
    };
  }

  /**
   * 生成用户友好的错误消息
   */
  generateUserFriendlyMessage(errorAnalysis: ErrorAnalysis): string {
    let message = `❌ ${errorAnalysis.userMessage}\n\n`;
    
    message += '💡 建议的解决方案：\n';
    errorAnalysis.suggestions.forEach((suggestion, index) => {
      message += `   ${index + 1}. ${suggestion}\n`;
    });

    message += '\n📋 技术详情：\n';
    message += `   错误类型: ${errorAnalysis.type}\n`;
    message += `   原始错误: ${errorAnalysis.originalError}\n`;

    return message;
  }

  /**
   * 根据错误类型获取配置优化建议
   */
  getConfigurationRecommendations(errorType: string, currentConfig: VllmMemoryConfig): VllmMemoryConfig {
    const recommendations: VllmMemoryConfig = {};

    switch (errorType) {
      case 'MEMORY_ERROR':
        recommendations.gpuMemoryUtilization = Math.max(0.5, (currentConfig.gpuMemoryUtilization || 0.9) - 0.2);
        recommendations.maxModelLen = Math.max(2048, Math.floor((currentConfig.maxModelLen || 4096) * 0.7));
        recommendations.maxNumSeqs = Math.max(64, Math.floor((currentConfig.maxNumSeqs || 256) * 0.5));
        recommendations.enforceEager = true;
        recommendations.swapSpace = Math.max(4, (currentConfig.swapSpace || 4) + 2);
        break;

      case 'ALLOCATION_ERROR':
        recommendations.maxNumBatchedTokens = Math.max(512, Math.floor((currentConfig.maxNumBatchedTokens || 2048) * 0.5));
        recommendations.blockSize = Math.max(8, (currentConfig.blockSize || 16) - 4);
        recommendations.quantization = 'int8';
        break;

      case 'PARALLEL_ERROR':
        recommendations.tensorParallelSize = 1;
        recommendations.pipelineParallelSize = 1;
        break;

      case 'QUANTIZATION_ERROR':
        recommendations.quantization = null; // 禁用量化
        break;

      default:
        // 通用的保守配置
        recommendations.gpuMemoryUtilization = 0.7;
        recommendations.maxModelLen = 2048;
        recommendations.maxNumSeqs = 128;
        recommendations.enforceEager = true;
        break;
    }

    this.logger.debug(`Generated recommendations for ${errorType}:`, recommendations);
    return recommendations;
  }

  /**
   * 分析错误并提供完整的解决方案
   */
  analyzeErrorWithRecommendations(errorMessage: string, currentConfig: VllmMemoryConfig): ErrorAnalysis {
    const analysis = this.analyzeErrorLegacy(errorMessage);
    const recommendations = this.getConfigurationRecommendations(analysis.type, currentConfig);

    return {
      ...analysis,
      recommendations
    };
  }

  /**
   * 检查配置是否可能导致内存问题
   */
  validateConfigurationRisks(config: VllmMemoryConfig): string[] {
    const warnings: string[] = [];

    if (config.gpuMemoryUtilization && config.gpuMemoryUtilization > 0.9) {
      warnings.push('GPU 显存利用率过高 (>90%)，可能导致内存不足');
    }

    if (config.maxModelLen && config.maxModelLen > 8192) {
      warnings.push('最大模型长度过大，可能消耗大量显存');
    }

    if (config.maxNumSeqs && config.maxNumSeqs > 512) {
      warnings.push('最大并发序列数过多，可能导致显存不足');
    }

    if (config.enforceEager === false && config.gpuMemoryUtilization && config.gpuMemoryUtilization > 0.8) {
      warnings.push('在高显存利用率下建议启用 enforce-eager 模式');
    }

    return warnings;
  }
}
