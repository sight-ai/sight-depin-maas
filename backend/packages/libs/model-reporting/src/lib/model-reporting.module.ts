import { Module } from '@nestjs/common';
import ModelReportingServiceProvider from './model-reporting.service';
import { ModelFrameworkModule } from '@saito/model-framework';
import { DeviceStatusModule } from '@saito/device-status';

@Module({
  imports: [
    DeviceStatusModule,
    ModelFrameworkModule
  ],
  providers: [
    ModelReportingServiceProvider
  ],
  exports: [ModelReportingServiceProvider]
})
export class ModelReportingModule {}
