import { Module } from '@nestjs/common';
import ModelReportingServiceProvider from './model-reporting.service';
import {
  ModelFrameworkModule,
  ModelServiceFactoryImpl,
  FrameworkDetectorService
} from '@saito/model-framework';
import { DeviceStatusModule } from '@saito/device-status';

@Module({
  imports: [
    DeviceStatusModule
  ],
  providers: [
    ModelReportingServiceProvider,
    FrameworkDetectorService,
    ModelServiceFactoryImpl,
    {
      provide: 'ModelServiceFactory',
      useClass: ModelServiceFactoryImpl
    }
  ],
  exports: [ModelReportingServiceProvider]
})
export class ModelReportingModule {}
