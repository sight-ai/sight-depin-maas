import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PersistentModule } from '@saito/persistent';
import { DeviceStatusRepository } from './device-status.repository';
import DeviceStatusServiceProvider from './device-status.service';
import { TunnelModule } from '@saito/tunnel';
import { ScheduleModule } from '@nestjs/schedule';
import { ModelFrameworkModule } from '@saito/model-framework';

// 导入新的服务组件
import DeviceRegistryServiceProvider from './services/device-registry.service';
import DeviceConfigServiceProvider from './services/device-config.service';
import DeviceDatabaseServiceProvider from './services/device-database.service';
import DeviceHeartbeatServiceProvider from './services/device-heartbeat.service';
import DeviceSystemServiceProvider from './services/device-system.service';
import DeviceGatewayServiceProvider from './services/device-gateway.service';
import AutoRegistrationServiceProvider from './services/auto-registration.service';
import StartupInitializationServiceProvider from './services/startup-initialization.service';
import { DynamicConfigService } from './services/dynamic-config.service';
import { RegistrationStorage } from './registration-storage';

// 保留旧的管理器组件以保持兼容性
import { SystemInfoCollector } from './collectors/system-info.collector';
import { HeartbeatManager } from './managers/heartbeat.manager';
import { DeviceConfigManager } from './managers/device-config.manager';
import { DeviceRegistrationManager } from './managers/device-registration.manager';
import { ConnectionManager } from './managers/connection.manager';
import { ModelManager } from './managers/model.manager';
import { DatabaseManager } from './managers/database.manager';

@Module({
  imports: [
    HttpModule,
    PersistentModule,
    ScheduleModule.forRoot(),
    forwardRef(() => TunnelModule),
    ModelFrameworkModule
  ],
  providers: [
    // 新的优化服务组件
    DeviceRegistryServiceProvider,
    DeviceConfigServiceProvider,
    DeviceDatabaseServiceProvider,
    DeviceHeartbeatServiceProvider,
    DeviceSystemServiceProvider,
    DeviceGatewayServiceProvider,
    AutoRegistrationServiceProvider,
    StartupInitializationServiceProvider,
    DynamicConfigService,
    RegistrationStorage,

    // 主服务
    DeviceStatusServiceProvider,
    DeviceStatusRepository,

    // 保留旧的组件以保持兼容性
    SystemInfoCollector,
    HeartbeatManager,
    DeviceConfigManager,
    DeviceRegistrationManager,
    ConnectionManager,
    ModelManager,
    DatabaseManager,
    TunnelModule
  ],
  exports: [
    // 新的优化服务组件
    DeviceRegistryServiceProvider,
    DeviceConfigServiceProvider,
    DeviceDatabaseServiceProvider,
    DeviceHeartbeatServiceProvider,
    DeviceSystemServiceProvider,
    DeviceGatewayServiceProvider,
    AutoRegistrationServiceProvider,
    StartupInitializationServiceProvider,
    DynamicConfigService,
    RegistrationStorage,

    // 主服务
    DeviceStatusServiceProvider,
    DeviceStatusRepository,

    // 保留旧的组件以保持兼容性
    SystemInfoCollector,
    HeartbeatManager,
    DeviceConfigManager,
    DeviceRegistrationManager,
    ConnectionManager,
    ModelManager,
    DatabaseManager,
  ],
})
export class DeviceStatusModule {}
