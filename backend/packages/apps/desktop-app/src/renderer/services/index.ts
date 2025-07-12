/**
 * 数据服务统一导出
 * 
 * 遵循SOLID原则的模块化架构：
 * - 单一职责原则：每个服务类只负责特定领域的数据管理
 * - 开闭原则：对扩展开放，对修改封闭
 * - 依赖倒置原则：高层模块不依赖低层模块，都依赖抽象
 * - 接口隔离原则：客户端不应该依赖它不需要的接口
 * - 里氏替换原则：子类可以替换父类而不影响程序正确性
 */

// 基础服务
export { BaseDataService } from './base/BaseDataService';

// Dashboard相关服务
export { DashboardDataService } from './dashboard/DashboardDataService';

// 设备相关服务
export { DeviceStatusDataService } from './device/DeviceStatusDataService';
export { DeviceRegistrationDataService } from './device/DeviceRegistrationDataService';

// 模型相关服务
export { ModelConfigDataService } from './model/ModelConfigDataService';
export { ModelConfigurationDataService } from './model/ModelConfigurationDataService';

// 收益相关服务
export { EarningsDataService } from './earnings/EarningsDataService';

// 网络通信相关服务
export { GatewayConfigDataService } from './network/GatewayConfigDataService';
export { CommunicationDataService } from './network/CommunicationDataService';

// 系统管理相关服务
export { DIDManagementDataService } from './system/DIDManagementDataService';
export { SettingsDataService } from './system/SettingsDataService';

/**
 * 服务工厂函数
 *
 * 提供统一的服务创建接口，遵循工厂模式
 */
import { BackendStatus } from '../hooks/types';
import { DashboardDataService } from './dashboard/DashboardDataService';
import { DeviceStatusDataService } from './device/DeviceStatusDataService';
import { DeviceRegistrationDataService } from './device/DeviceRegistrationDataService';
import { ModelConfigDataService } from './model/ModelConfigDataService';
import { ModelConfigurationDataService } from './model/ModelConfigurationDataService';
import { EarningsDataService } from './earnings/EarningsDataService';
import { GatewayConfigDataService } from './network/GatewayConfigDataService';
import { CommunicationDataService } from './network/CommunicationDataService';
import { DIDManagementDataService } from './system/DIDManagementDataService';
import { SettingsDataService } from './system/SettingsDataService';

export class DataServiceFactory {
  /**
   * 创建Dashboard数据服务
   */
  static createDashboardService(backendStatus: BackendStatus | null) {
    if (!backendStatus) {
      throw new Error('Backend status is required for Dashboard service');
    }
    return new DashboardDataService(backendStatus);
  }

  /**
   * 创建设备状态数据服务
   */
  static createDeviceStatusService(backendStatus: BackendStatus | null) {
    return new DeviceStatusDataService(backendStatus);
  }

  /**
   * 创建设备注册数据服务
   */
  static createDeviceRegistrationService(backendStatus: BackendStatus | null) {
    return new DeviceRegistrationDataService(backendStatus);
  }

  /**
   * 创建模型配置数据服务
   */
  static createModelConfigService(backendStatus: BackendStatus | null) {
    return new ModelConfigDataService(backendStatus);
  }

  /**
   * 创建模型配置数据服务（高级）
   */
  static createModelConfigurationService(backendStatus: BackendStatus | null) {
    return new ModelConfigurationDataService(backendStatus);
  }

  /**
   * 创建收益数据服务
   */
  static createEarningsService(backendStatus: BackendStatus | null) {
    return new EarningsDataService(backendStatus);
  }

  /**
   * 创建网关配置数据服务
   */
  static createGatewayConfigService(backendStatus: BackendStatus | null) {
    return new GatewayConfigDataService(backendStatus);
  }

  /**
   * 创建通信数据服务
   */
  static createCommunicationService(backendStatus: BackendStatus | null) {
    return new CommunicationDataService(backendStatus);
  }

  /**
   * 创建DID管理数据服务
   */
  static createDIDManagementService(backendStatus: BackendStatus | null) {
    return new DIDManagementDataService(backendStatus);
  }

  /**
   * 创建设置数据服务
   */
  static createSettingsService(backendStatus: BackendStatus | null) {
    return new SettingsDataService(backendStatus);
  }
}

/**
 * 服务类型映射
 * 
 * 用于类型安全的服务创建
 */
export type ServiceType = 
  | 'dashboard'
  | 'deviceStatus'
  | 'deviceRegistration'
  | 'modelConfig'
  | 'modelConfiguration'
  | 'earnings'
  | 'gatewayConfig'
  | 'communication'
  | 'didManagement'
  | 'settings';

/**
 * 通用服务创建函数
 * 
 * @param serviceType 服务类型
 * @param backendStatus 后端状态
 * @returns 对应的数据服务实例
 */
export function createDataService(serviceType: ServiceType, backendStatus: BackendStatus | null) {
  switch (serviceType) {
    case 'dashboard':
      return DataServiceFactory.createDashboardService(backendStatus);
    case 'deviceStatus':
      return DataServiceFactory.createDeviceStatusService(backendStatus);
    case 'deviceRegistration':
      return DataServiceFactory.createDeviceRegistrationService(backendStatus);
    case 'modelConfig':
      return DataServiceFactory.createModelConfigService(backendStatus);
    case 'modelConfiguration':
      return DataServiceFactory.createModelConfigurationService(backendStatus);
    case 'earnings':
      return DataServiceFactory.createEarningsService(backendStatus);
    case 'gatewayConfig':
      return DataServiceFactory.createGatewayConfigService(backendStatus);
    case 'communication':
      return DataServiceFactory.createCommunicationService(backendStatus);
    case 'didManagement':
      return DataServiceFactory.createDIDManagementService(backendStatus);
    case 'settings':
      return DataServiceFactory.createSettingsService(backendStatus);
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

/**
 * 模块架构说明
 * 
 * 新的模块化架构具有以下优势：
 * 
 * 1. **单一职责原则**：每个服务类只负责特定领域的数据管理
 * 2. **高内聚低耦合**：相关功能聚合在一起，模块间依赖最小化
 * 3. **可维护性**：代码结构清晰，易于理解和修改
 * 4. **可扩展性**：新增功能时只需添加新的服务类
 * 5. **可测试性**：每个服务类可以独立测试
 * 6. **代码复用**：基础功能在BaseDataService中统一实现
 * 
 * 目录结构：
 * services/
 * ├── base/                    # 基础服务
 * │   └── BaseDataService.ts
 * ├── dashboard/               # Dashboard相关
 * │   └── DashboardDataService.ts
 * ├── device/                  # 设备相关
 * │   ├── DeviceStatusDataService.ts
 * │   └── DeviceRegistrationDataService.ts
 * ├── model/                   # 模型相关
 * │   ├── ModelConfigDataService.ts
 * │   └── ModelConfigurationDataService.ts
 * ├── earnings/                # 收益相关
 * │   └── EarningsDataService.ts
 * ├── network/                 # 网络通信相关
 * │   ├── GatewayConfigDataService.ts
 * │   └── CommunicationDataService.ts
 * ├── system/                  # 系统管理相关
 * │   ├── DIDManagementDataService.ts
 * │   └── SettingsDataService.ts
 * └── index.ts                 # 统一导出
 */
