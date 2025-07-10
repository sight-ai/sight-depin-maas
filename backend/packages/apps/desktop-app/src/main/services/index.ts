/**
 * Desktop App 服务导出
 * 
 * 统一导出所有服务和接口
 */

// 配置相关
export * from '../interfaces/desktop-config.interface';
export * from './desktop-config.service';
export * from './desktop-config-factory.service';

// 重新导出统一配置管理服务
export {
  EnhancedUnifiedConfigService,
  UnifiedConfigFactoryService,
  IConfigManager,
  ConfigType,
  ConfigScope
} from '@saito/common';
