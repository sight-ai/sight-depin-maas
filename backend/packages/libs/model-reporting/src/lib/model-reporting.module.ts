import { Module, forwardRef } from '@nestjs/common';
import ModelReportingServiceProvider from './model-reporting.service';
import { OllamaModule } from '@saito/ollama';
import { DeviceStatusModule } from '@saito/device-status';

@Module({
  imports: [
    forwardRef(() => OllamaModule),
    DeviceStatusModule
  ],
  providers: [ModelReportingServiceProvider],
  exports: [ModelReportingServiceProvider]
})
export class ModelReportingModule {}
