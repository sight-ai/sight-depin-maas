import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PersistentModule } from '@saito/persistent';
import { DeviceStatusRepository } from './device-status.repository';
import DeviceStatusServiceProvider from './device-status.service';
import { TunnelModule } from '@saito/tunnel';
import { ScheduleModule } from '@nestjs/schedule';
import { ModelFrameworkModule } from '@saito/model-framework';

@Module({
  imports: [
    HttpModule,
    PersistentModule,
    ScheduleModule.forRoot(),
    forwardRef(() => TunnelModule),
    ModelFrameworkModule
  ],
  providers: [DeviceStatusServiceProvider, DeviceStatusRepository],
  exports: [DeviceStatusServiceProvider, DeviceStatusRepository],
})
export class DeviceStatusModule {}
