/**
 * 收益费率配置类型
 */
export interface EarningsRate {
  input: number;
  output: number;
  base: number;
}

/**
 * 收益计算结果类型
 */
export interface EarningsCalculationResult {
  blockRewards: number;
  jobRewards: number;
  breakdown: {
    inputReward: number;
    outputReward: number;
    baseReward: number;
    durationBonus: number;
  };
}

/**
 * 框架能力信息类型
 */
export interface FrameworkCapabilities {
  supportedStyles: string[];
  endpoints: string[];
}

/**
 * 支持的端点配置类型
 */
export interface SupportedEndpoints {
  ollama: string[];
  vllm: string[];
  openai: string[];
}

/**
 * 配置摘要类型
 */
export interface ConfigSummary {
  frameworks: string[];
  taskTypes: string[];
  totalEndpoints: number;
  rateRanges: {
    inputMin: number;
    inputMax: number;
    outputMin: number;
    outputMax: number;
  };
}

/**
 * 收益跟踪数据类型
 */
export interface EarningsTrackingData {
  taskId: string;
  framework: string;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  duration?: number;
  url: string;
  timestamp: number;
}

/**
 * 收益记录类型
 */
export interface EarningsRecord {
  id: string;
  taskId: string;
  deviceId: string;
  framework: string;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  duration: number;
  earnings: EarningsCalculationResult;
  url: string;
  timestamp: number;
  createdAt: Date;
}
