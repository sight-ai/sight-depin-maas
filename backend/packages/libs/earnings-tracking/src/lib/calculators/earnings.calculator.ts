import { Injectable, Logger } from '@nestjs/common';
import { EarningsRate, EarningsCalculationResult } from '../earnings-tracking.types';

/**
 * 收益计算器
 * 
 * 负责根据费率配置计算具体的收益
 */
@Injectable()
export class EarningsCalculator {
  private readonly logger = new Logger(EarningsCalculator.name);

  /**
   * 计算收益
   */
  calculateEarnings(
    rate: EarningsRate,
    inputTokens: number,
    outputTokens: number,
    duration?: number
  ): EarningsCalculationResult {
    // 基础收益计算
    const inputReward = inputTokens * rate.input;
    const outputReward = outputTokens * rate.output;
    const baseReward = rate.base;
    
    // 时长奖励（可选）
    const durationBonus = this.calculateDurationBonus(duration);
    
    const totalJobRewards = inputReward + outputReward + baseReward + durationBonus;

    const result = {
      blockRewards: 0, // 暂时不使用 block rewards
      jobRewards: totalJobRewards,
      breakdown: {
        inputReward,
        outputReward,
        baseReward,
        durationBonus
      }
    };

    this.logger.debug(`Calculated earnings: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * 批量计算收益
   */
  calculateBatchEarnings(
    calculations: Array<{
      rate: EarningsRate;
      inputTokens: number;
      outputTokens: number;
      duration?: number;
    }>
  ): EarningsCalculationResult[] {
    return calculations.map(calc => 
      this.calculateEarnings(calc.rate, calc.inputTokens, calc.outputTokens, calc.duration)
    );
  }

  /**
   * 计算总收益
   */
  calculateTotalEarnings(results: EarningsCalculationResult[]): EarningsCalculationResult {
    const totalBlockRewards = results.reduce((sum, result) => sum + result.blockRewards, 0);
    const totalJobRewards = results.reduce((sum, result) => sum + result.jobRewards, 0);
    
    const totalBreakdown = results.reduce(
      (acc, result) => ({
        inputReward: acc.inputReward + result.breakdown.inputReward,
        outputReward: acc.outputReward + result.breakdown.outputReward,
        baseReward: acc.baseReward + result.breakdown.baseReward,
        durationBonus: acc.durationBonus + result.breakdown.durationBonus
      }),
      { inputReward: 0, outputReward: 0, baseReward: 0, durationBonus: 0 }
    );

    return {
      blockRewards: totalBlockRewards,
      jobRewards: totalJobRewards,
      breakdown: totalBreakdown
    };
  }

  /**
   * 计算时长奖励
   */
  private calculateDurationBonus(duration?: number): number {
    if (!duration || duration <= 1000) {
      return 0;
    }
    
    // 超过1秒的请求给予小额奖励，最多0.01奖励
    return Math.min(duration / 10000, 0.01);
  }

  /**
   * 验证收益计算结果
   */
  validateEarningsResult(result: EarningsCalculationResult): boolean {
    // 检查数值是否有效
    if (result.blockRewards < 0 || result.jobRewards < 0) {
      this.logger.error('Invalid earnings result: negative values');
      return false;
    }

    // 检查分解是否一致
    const calculatedTotal = 
      result.breakdown.inputReward + 
      result.breakdown.outputReward + 
      result.breakdown.baseReward + 
      result.breakdown.durationBonus;

    const tolerance = 0.0001; // 浮点数精度容差
    if (Math.abs(calculatedTotal - result.jobRewards) > tolerance) {
      this.logger.error('Invalid earnings result: breakdown does not match total');
      return false;
    }

    return true;
  }

  /**
   * 格式化收益显示
   */
  formatEarnings(result: EarningsCalculationResult): string {
    return `Total: ${result.jobRewards.toFixed(6)} (Input: ${result.breakdown.inputReward.toFixed(6)}, Output: ${result.breakdown.outputReward.toFixed(6)}, Base: ${result.breakdown.baseReward.toFixed(6)}, Duration: ${result.breakdown.durationBonus.toFixed(6)})`;
  }
}
