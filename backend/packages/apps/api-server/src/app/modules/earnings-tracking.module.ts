import { Module } from '@nestjs/common';
import { EarningsTrackingInterceptor } from '../interceptors/earnings-tracking.interceptor';
import { EarningsConfigService } from '../services/earnings-config.service';
import { MinerModule } from '@saito/miner';
import { DeviceStatusModule } from '@saito/device-status';
import { ModelFrameworkModule } from '@saito/model-framework';

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
    ModelFrameworkModule
  ],
  providers: [
    EarningsConfigService,
    EarningsTrackingInterceptor
  ],
  exports: [
    EarningsConfigService,
    EarningsTrackingInterceptor
  ]
})
export class EarningsTrackingModule {}
