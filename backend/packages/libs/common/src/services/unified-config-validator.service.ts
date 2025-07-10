import { Injectable, Logger } from '@nestjs/common';
import {
  IConfigValidator,
  ConfigValue,
  ConfigMetadata,
  ConfigValidationResult,
  ConfigType
} from '../interfaces/unified-config.interface';

/**
 * 验证规则函数类型
 */
type ValidationRule = (value: ConfigValue) => boolean | string;

/**
 * 内置验证规则
 */
interface BuiltInRules {
  required: ValidationRule;
  string: ValidationRule;
  number: ValidationRule;
  boolean: ValidationRule;
  array: ValidationRule;
  object: ValidationRule;
  email: ValidationRule;
  url: ValidationRule;
  port: ValidationRule;
  ipAddress: ValidationRule;
  range: (min: number, max: number) => ValidationRule;
  minLength: (length: number) => ValidationRule;
  maxLength: (length: number) => ValidationRule;
  pattern: (regex: RegExp) => ValidationRule;
  oneOf: (values: any[]) => ValidationRule;
}

/**
 * 统一配置验证器服务
 * 
 * 职责：
 * 1. 提供统一的配置验证逻辑
 * 2. 支持自定义验证规则
 * 3. 提供内置的常用验证规则
 * 4. 遵循开闭原则，可扩展验证规则
 */
@Injectable()
export class UnifiedConfigValidatorService implements IConfigValidator {
  private readonly logger = new Logger(UnifiedConfigValidatorService.name);
  private readonly customRules = new Map<string, ValidationRule>();
  private readonly builtInRules: BuiltInRules;

  constructor() {
    this.builtInRules = this.createBuiltInRules();
  }

  /**
   * 验证单个配置项
   */
  async validateItem(key: string, value: ConfigValue, metadata: ConfigMetadata): Promise<ConfigValidationResult> {
    const errors: Array<{ key: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: Array<{ key: string; message: string }> = [];

    try {
      // 检查必填项
      if (metadata.required && (value === null || value === undefined || value === '')) {
        errors.push({
          key,
          message: `Configuration '${key}' is required but not provided`,
          severity: 'error'
        });
        return { isValid: false, errors, warnings };
      }

      // 如果值为空且不是必填项，跳过验证
      if (value === null || value === undefined) {
        return { isValid: true, errors, warnings };
      }

      // 使用验证模式验证
      if (metadata.validationSchema) {
        const schemaErrors = await this.validateWithSchema(key, value, metadata.validationSchema);
        errors.push(...schemaErrors);
      }

      // 类型特定验证
      const typeErrors = this.validateByType(key, value, metadata.type);
      errors.push(...typeErrors);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error(`Validation error for ${key}:`, error);
      errors.push({
        key,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });

      return { isValid: false, errors, warnings };
    }
  }

  /**
   * 验证配置集合
   */
  async validateConfig(
    config: Record<string, ConfigValue>,
    metadata: Record<string, ConfigMetadata>
  ): Promise<ConfigValidationResult> {
    const allErrors: Array<{ key: string; message: string; severity: 'error' | 'warning' }> = [];
    const allWarnings: Array<{ key: string; message: string }> = [];

    // 验证每个配置项
    for (const [key, meta] of Object.entries(metadata)) {
      const value = config[key];
      const result = await this.validateItem(key, value, meta);
      
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    // 检查未定义的配置项
    for (const key of Object.keys(config)) {
      if (!metadata[key]) {
        allWarnings.push({
          key,
          message: `Configuration '${key}' is not defined in metadata`
        });
      }
    }

    return {
      isValid: allErrors.filter(e => e.severity === 'error').length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * 注册验证规则
   */
  registerRule(key: string, rule: ValidationRule): void {
    this.customRules.set(key, rule);
    this.logger.debug(`Registered custom validation rule: ${key}`);
  }

  /**
   * 获取默认值
   */
  getDefaultValue(key: string, metadata: ConfigMetadata): ConfigValue {
    if (metadata.defaultValue !== undefined) {
      return metadata.defaultValue;
    }

    // 根据类型返回默认值
    switch (metadata.type) {
      case ConfigType.APPLICATION:
        return this.getApplicationDefaults(key);
      case ConfigType.FRAMEWORK:
        return this.getFrameworkDefaults(key);
      case ConfigType.DEVICE:
        return this.getDeviceDefaults(key);
      case ConfigType.SYSTEM:
        return this.getSystemDefaults(key);
      case ConfigType.USER:
        return this.getUserDefaults(key);
      default:
        return null;
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 创建内置验证规则
   */
  private createBuiltInRules(): BuiltInRules {
    return {
      required: (value) => {
        return value !== null && value !== undefined && value !== '';
      },

      string: (value) => {
        return typeof value === 'string';
      },

      number: (value) => {
        return typeof value === 'number' && !isNaN(value);
      },

      boolean: (value) => {
        return typeof value === 'boolean';
      },

      array: (value) => {
        return Array.isArray(value);
      },

      object: (value) => {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      },

      email: (value) => {
        if (typeof value !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },

      url: (value) => {
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },

      port: (value) => {
        if (typeof value !== 'number') return false;
        return value >= 1 && value <= 65535;
      },

      ipAddress: (value) => {
        if (typeof value !== 'string') return false;
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(value);
      },

      range: (min: number, max: number) => (value) => {
        if (typeof value !== 'number') return false;
        return value >= min && value <= max;
      },

      minLength: (length: number) => (value) => {
        if (typeof value !== 'string' && !Array.isArray(value)) return false;
        return value.length >= length;
      },

      maxLength: (length: number) => (value) => {
        if (typeof value !== 'string' && !Array.isArray(value)) return false;
        return value.length <= length;
      },

      pattern: (regex: RegExp) => (value) => {
        if (typeof value !== 'string') return false;
        return regex.test(value);
      },

      oneOf: (values: any[]) => (value) => {
        return values.includes(value);
      }
    };
  }

  /**
   * 使用模式验证
   */
  private async validateWithSchema(
    key: string,
    value: ConfigValue,
    schema: any
  ): Promise<Array<{ key: string; message: string; severity: 'error' | 'warning' }>> {
    const errors: Array<{ key: string; message: string; severity: 'error' | 'warning' }> = [];

    if (typeof schema === 'object' && schema.rules) {
      for (const ruleName of schema.rules) {
        const rule = this.customRules.get(ruleName) || this.getBuiltInRule(ruleName);
        
        if (rule) {
          const result = rule(value);
          if (result !== true) {
            errors.push({
              key,
              message: typeof result === 'string' ? result : `Validation rule '${ruleName}' failed`,
              severity: 'error'
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * 根据类型验证
   */
  private validateByType(
    key: string,
    value: ConfigValue,
    type: ConfigType
  ): Array<{ key: string; message: string; severity: 'error' | 'warning' }> {
    const errors: Array<{ key: string; message: string; severity: 'error' | 'warning' }> = [];

    switch (type) {
      case ConfigType.FRAMEWORK:
        if (key.includes('port') && !this.builtInRules.port(value)) {
          errors.push({
            key,
            message: 'Port must be a number between 1 and 65535',
            severity: 'error'
          });
        }
        break;

      case ConfigType.DEVICE:
        if (key.includes('address') && typeof value === 'string' && value.includes('@')) {
          if (!this.builtInRules.email(value)) {
            errors.push({
              key,
              message: 'Invalid email address format',
              severity: 'error'
            });
          }
        }
        break;

      case ConfigType.SYSTEM:
        if (key.includes('memory') && typeof value === 'number' && value < 0) {
          errors.push({
            key,
            message: 'Memory values cannot be negative',
            severity: 'error'
          });
        }
        break;
    }

    return errors;
  }

  /**
   * 获取内置规则
   */
  private getBuiltInRule(ruleName: string): ValidationRule | null {
    return (this.builtInRules as any)[ruleName] || null;
  }

  /**
   * 获取应用默认值
   */
  private getApplicationDefaults(key: string): ConfigValue {
    const defaults: Record<string, ConfigValue> = {
      'environment': 'production',
      'logLevel': 'info',
      'enableMetrics': true,
      'enableTelemetry': false
    };
    return defaults[key] || null;
  }

  /**
   * 获取框架默认值
   */
  private getFrameworkDefaults(key: string): ConfigValue {
    const defaults: Record<string, ConfigValue> = {
      'ollama.port': 11434,
      'ollama.host': 'localhost',
      'vllm.port': 8000,
      'vllm.host': '0.0.0.0',
      'vllm.gpuMemoryUtilization': 0.9,
      'vllm.maxModelLen': 4096
    };
    return defaults[key] || null;
  }

  /**
   * 获取设备默认值
   */
  private getDeviceDefaults(key: string): ConfigValue {
    const defaults: Record<string, ConfigValue> = {
      'deviceName': '',
      'isRegistered': false,
      'autoRegister': false
    };
    return defaults[key] || null;
  }

  /**
   * 获取系统默认值
   */
  private getSystemDefaults(key: string): ConfigValue {
    const defaults: Record<string, ConfigValue> = {
      'maxCpuUsage': 80,
      'maxMemoryUsage': 80,
      'monitoringInterval': 5000
    };
    return defaults[key] || null;
  }

  /**
   * 获取用户默认值
   */
  private getUserDefaults(key: string): ConfigValue {
    const defaults: Record<string, ConfigValue> = {
      'theme': 'light',
      'language': 'en',
      'autoSave': true
    };
    return defaults[key] || null;
  }
}
