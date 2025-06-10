import { Module } from '@nestjs/common';
import { EarningsTrackingInterceptor } from './interceptors/earnings-tracking.interceptor';
import { EarningsConfigService } from './services/earnings-config.service';
import { FrameworkDetector } from './detectors/framework.detector';
import { TaskTypeDetector } from './detectors/task-type.detector';
import { EarningsCalculator } from './calculators/earnings.calculator';
import { EarningsRatesConfig } from './config/earnings-rates.config';
import { MinerModule } from '@saito/miner';
import { DeviceStatusModule } from '@saito/device-status';
import { ModelInferenceClientModule } from '@saito/model-inference-client';

/**
 * 收益跟踪模块
 * 
 * 专门处理 API 调用的收益记录和任务跟踪
 * 避免循环依赖问题
 */
@Module({
  imports: [
    MinerModule,
    DeviceStatusModule,
    ModelInferenceClientModule
  ],
  providers: [
    // 核心服务
    EarningsConfigService,

    // 检测器
    FrameworkDetector,
    TaskTypeDetector,

    // 计算器
    EarningsCalculator,

    // 配置
    EarningsRatesConfig,

    // 拦截器
    EarningsTrackingInterceptor,
  ],
  exports: [
    EarningsConfigService,
    FrameworkDetector,
    TaskTypeDetector,
    EarningsCalculator,
    EarningsRatesConfig,
    EarningsTrackingInterceptor,
  ]
})
export class EarningsTrackingModule {}
