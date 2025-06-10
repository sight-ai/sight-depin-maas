import { z } from 'zod';
import {
  OllamaChatRequestSchema,
  OllamaChatResponseSchema
} from '../schemas/ollama/ollama-chat.schema';
import {
  OpenAIChatCompletionRequestSchema,
  OpenAIChatCompletionResponseSchema
} from '../schemas/openai/openai-chat.schema';
import {
  FrameworkConfigSchema,
  AppConfigSchema
} from '../schemas/config/framework-config.schema';
import {
  SystemInfoSchema,
  SystemHeartbeatDataSchema
} from '../schemas/system/system-info.schema';

/**
 * 验证框架配置
 */
export function validateFrameworkConfig(config: unknown) {
  return FrameworkConfigSchema.parse(config);
}

/**
 * 安全验证框架配置
 * 返回验证结果而不抛出异常
 */
export function safeValidateFrameworkConfig(config: unknown): {
  success: boolean;
  data?: z.infer<typeof FrameworkConfigSchema>;
  error?: z.ZodError;
} {
  const result = FrameworkConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * 验证系统信息
 */
export function validateSystemInfo(data: unknown) {
  return SystemInfoSchema.parse(data);
}

/**
 * 验证心跳数据
 */
export function validateSystemHeartbeatData(data: unknown) {
  return SystemHeartbeatDataSchema.parse(data);
}

/**
 * 安全验证系统信息数据
 */
export function safeValidateSystemInfo(data: unknown): { success: true; data: z.infer<typeof SystemInfoSchema> } | { success: false; error: z.ZodError } {
  const result = SystemInfoSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * 安全验证心跳数据
 */
export function safeValidateSystemHeartbeatData(data: unknown): { success: true; data: z.infer<typeof SystemHeartbeatDataSchema> } | { success: false; error: z.ZodError } {
  const result = SystemHeartbeatDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  /**
   * 获取格式化的错误信息
   */
  getFormattedErrors(): string[] {
    return this.errors.map(error => 
      `${error.path.join('.')}: ${error.message}`
    );
  }

  /**
   * 获取错误摘要
   */
  getErrorSummary(): string {
    return this.getFormattedErrors().join('; ');
  }
}

/**
 * 请求验证器类
 * 
 * 提供统一的验证函数，确保类型安全和运行时验证一致性
 */
export class RequestValidators {
  /**
   * 验证 Ollama 聊天请求
   */
  static validateOllamaChatRequest(data: unknown): z.infer<typeof OllamaChatRequestSchema> {
    try {
      return OllamaChatRequestSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid Ollama chat request', error.errors);
      }
      throw error;
    }
  }

  /**
   * 验证 Ollama 聊天响应
   */
  static validateOllamaChatResponse(data: unknown): z.infer<typeof OllamaChatResponseSchema> {
    try {
      return OllamaChatResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid Ollama chat response', error.errors);
      }
      throw error;
    }
  }

  /**
   * 验证 OpenAI 聊天请求
   */
  static validateOpenAIChatRequest(data: unknown): z.infer<typeof OpenAIChatCompletionRequestSchema> {
    try {
      return OpenAIChatCompletionRequestSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid OpenAI chat request', error.errors);
      }
      throw error;
    }
  }

  /**
   * 验证 OpenAI 聊天响应
   */
  static validateOpenAIChatResponse(data: unknown): z.infer<typeof OpenAIChatCompletionResponseSchema> {
    try {
      return OpenAIChatCompletionResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid OpenAI chat response', error.errors);
      }
      throw error;
    }
  }

  /**
   * 验证框架配置
   */
  static validateFrameworkConfig(data: unknown): z.infer<typeof FrameworkConfigSchema> {
    try {
      return FrameworkConfigSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid framework config', error.errors);
      }
      throw error;
    }
  }

  /**
   * 验证应用配置
   */
  static validateAppConfig(data: unknown): z.infer<typeof AppConfigSchema> {
    try {
      return AppConfigSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid app config', error.errors);
      }
      throw error;
    }
  }

  /**
   * 验证系统信息
   */
  static validateSystemInfo(data: unknown): z.infer<typeof SystemInfoSchema> {
    try {
      return SystemInfoSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid system info', error.errors);
      }
      throw error;
    }
  }

  /**
   * 验证心跳数据
   */
  static validateHeartbeatData(data: unknown): z.infer<typeof SystemHeartbeatDataSchema> {
    try {
      return SystemHeartbeatDataSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid heartbeat data', error.errors);
      }
      throw error;
    }
  }

  /**
   * 通用请求验证
   */
  static validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Request validation failed', error.errors);
      }
      throw error;
    }
  }

  /**
   * 安全验证（不抛出异常）
   */
  static safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: string[];
  } {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
  }

  /**
   * 批量验证
   */
  static validateBatch<T>(schema: z.ZodSchema<T>, dataArray: unknown[]): {
    validItems: T[];
    invalidItems: Array<{ index: number; errors: string[] }>;
  } {
    const validItems: T[] = [];
    const invalidItems: Array<{ index: number; errors: string[] }> = [];

    dataArray.forEach((data, index) => {
      const result = this.safeValidate(schema, data);
      if (result.success && result.data) {
        validItems.push(result.data);
      } else {
        invalidItems.push({
          index,
          errors: result.errors || ['Unknown validation error']
        });
      }
    });

    return { validItems, invalidItems };
  }

  /**
   * 验证并转换数据类型
   */
  static validateAndTransform<T, U>(
    schema: z.ZodSchema<T>, 
    data: unknown, 
    transformer: (data: T) => U
  ): U {
    const validatedData = this.validateRequest(schema, data);
    return transformer(validatedData);
  }

  /**
   * 条件验证
   */
  static validateIf<T>(
    condition: boolean,
    schema: z.ZodSchema<T>,
    data: unknown
  ): T | null {
    if (!condition) {
      return null;
    }
    return this.validateRequest(schema, data);
  }
}

/**
 * 验证器工厂
 */
export class ValidatorFactory {
  /**
   * 创建自定义验证器
   */
  static createValidator<T>(schema: z.ZodSchema<T>) {
    return {
      validate: (data: unknown): T => RequestValidators.validateRequest(schema, data),
      safeValidate: (data: unknown) => RequestValidators.safeValidate(schema, data),
      validateBatch: (dataArray: unknown[]) => RequestValidators.validateBatch(schema, dataArray)
    };
  }

  /**
   * 创建条件验证器
   */
  static createConditionalValidator<T>(
    schema: z.ZodSchema<T>,
    condition: (data: unknown) => boolean
  ) {
    return (data: unknown): T | null => {
      if (!condition(data)) {
        return null;
      }
      return RequestValidators.validateRequest(schema, data);
    };
  }
}

// 预定义的验证器实例
export const OllamaChatValidator = ValidatorFactory.createValidator(OllamaChatRequestSchema);
export const OpenAIChatValidator = ValidatorFactory.createValidator(OpenAIChatCompletionRequestSchema);
export const FrameworkConfigValidator = ValidatorFactory.createValidator(FrameworkConfigSchema);
export const SystemInfoValidator = ValidatorFactory.createValidator(SystemInfoSchema);
