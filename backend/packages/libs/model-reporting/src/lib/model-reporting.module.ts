import { Module } from '@nestjs/common';
import ModelReportingServiceProvider from './model-reporting.service';
import { ModelInferenceClientModule } from '@saito/model-inference-client';
import { DeviceStatusModule } from '@saito/device-status';

@Module({
  imports: [
    DeviceStatusModule,
    ModelInferenceClientModule
  ],
  providers: [
    ModelReportingServiceProvider
  ],
  exports: [ModelReportingServiceProvider]
})
export class ModelReportingModule {}
