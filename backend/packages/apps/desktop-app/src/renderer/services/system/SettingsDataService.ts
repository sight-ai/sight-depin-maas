/**
 * 设置数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责系统设置的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供设置特定的接口
 */

import { ApiResponse, SettingsData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * 设置数据服务 
 */
export class SettingsDataService extends BaseDataService<SettingsData> {
  async fetch(): Promise<ApiResponse<SettingsData>> {
    try {
      // 初始化设置数据 （使用模拟数据）
      const settingsData: SettingsData = this.getDefaultSettingsData();

      return this.createSuccessResponse(settingsData);
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch settings data'
      );
    }
  }

  /**
   * 更新设置数据
   */
  async update(data: Partial<SettingsData>): Promise<ApiResponse<SettingsData>> {
    try {
      // 处理设置更新
      if (data.generalSettings || data.performanceSettings || data.networkSettings || data.securitySettings) {
        // 目前没有更新设置的API，返回模拟成功
        // 实际应该调用类似 this.apiClient.updateSettings(data) 的方法
        
        // 重新获取最新状态
        return this.fetch();
      }

      return this.createErrorResponse('No valid update data provided');
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update settings'
      );
    }
  }

  /**
   * 重置设置到默认值
   */
  async resetToDefaults(): Promise<ApiResponse<SettingsData>> {
    try {
      // 目前没有重置设置的API，返回默认设置
      // 实际应该调用类似 this.apiClient.resetSettings() 的方法
      
      const defaultSettings = this.getDefaultSettingsData();
      return this.createSuccessResponse(defaultSettings);
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to reset settings'
      );
    }
  }

  /**
   * 导出设置配置
   */
  async exportSettings(): Promise<ApiResponse<any>> {
    try {
      const currentSettings = await this.fetch();
      
      if (currentSettings.success && currentSettings.data) {
        return {
          success: true,
          data: {
            message: 'Settings exported',
            settings: currentSettings.data,
            filename: `settings-${Date.now()}.json`,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return this.createErrorResponse('Failed to get current settings');
      }
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to export settings'
      );
    }
  }

  /**
   * 导入设置配置
   */
  async importSettings(settingsData: SettingsData): Promise<ApiResponse<SettingsData>> {
    try {
      // 验证设置数据格式
      if (!this.validateSettingsData(settingsData)) {
        return this.createErrorResponse('Invalid settings data format');
      }

      // 目前没有导入设置的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.importSettings(settingsData) 的方法
      
      return this.createSuccessResponse(settingsData);
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to import settings'
      );
    }
  }

  /**
   * 获取默认的设置数据
   */
  private getDefaultSettingsData(): SettingsData {
    return {
      generalSettings: {
        autoStartOnBoot: true,
        minimizeToTray: false,
        enableNotifications: true,
        language: 'en',
        theme: 'light',
        autoUpdate: true
      },
      performanceSettings: {
        maxCpuUsage: 80,
        maxMemoryUsage: 70,
        maxGpuUsage: 90,
        enableGpuAcceleration: true,
        modelCacheSize: 4096,
        concurrentTasks: 2
      },
      networkSettings: {
        enableP2P: true,
        p2pPort: 4001,
        maxConnections: 100,
        enableUPnP: true,
        bandwidthLimit: 0,
        enableProxy: false,
        proxySettings: {
          host: '',
          port: 0,
          username: '',
          password: ''
        }
      },
      securitySettings: {
        enableEncryption: true,
        requireAuthentication: false,
        sessionTimeout: 3600,
        enableLogging: true,
        logLevel: 'info',
        enableFirewall: true
      },
      advancedSettings: {
        debugMode: false,
        enableTelemetry: true,
        customConfigPath: '',
        enableExperimentalFeatures: false,
        apiTimeout: 30000,
        retryAttempts: 3
      }
    };
  }

  /**
   * 验证设置数据格式
   */
  private validateSettingsData(data: SettingsData): boolean {
    try {
      // 基本结构验证
      if (!data || typeof data !== 'object') {
        return false;
      }

      // 验证必需的设置组
      const requiredGroups = ['generalSettings', 'performanceSettings', 'networkSettings', 'securitySettings'];
      for (const group of requiredGroups) {
        if (!data[group as keyof SettingsData] || typeof data[group as keyof SettingsData] !== 'object') {
          return false;
        }
      }

      // 验证数值范围
      const performance = data.performanceSettings;
      if (performance) {
        if (performance.maxCpuUsage < 10 || performance.maxCpuUsage > 100) return false;
        if (performance.maxMemoryUsage < 10 || performance.maxMemoryUsage > 100) return false;
        if (performance.maxGpuUsage < 10 || performance.maxGpuUsage > 100) return false;
        if (performance.modelCacheSize < 512 || performance.modelCacheSize > 32768) return false;
        if (performance.concurrentTasks < 1 || performance.concurrentTasks > 10) return false;
      }

      // 验证网络设置
      const network = data.networkSettings;
      if (network) {
        if (network.p2pPort < 1024 || network.p2pPort > 65535) return false;
        if (network.maxConnections < 1 || network.maxConnections > 1000) return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
