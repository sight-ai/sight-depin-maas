import { Provider } from '@nestjs/common';
import { LocalConfigService } from '@saito/common';
import { IModelClient } from './model-service.interface';
import { OllamaClientService } from './ollama-client.service';
import { VllmClientService } from './vllm-client.service';
import { DynamicModelConfigService } from '../model-operations/dynamic-model-config.service';

/**
 * 动态客户端提供者令牌
 * 用于注入当前活跃的模型客户端
 */
export const ACTIVE_MODEL_CLIENT = Symbol('ACTIVE_MODEL_CLIENT');

/**
 * 支持的客户端类型
 */
export type ClientType = 'ollama' | 'vllm';

/**
 * 客户端工厂函数
 * 根据配置文件中的 client_type 返回对应的客户端实例
 */
export function createModelClientFactory(
  localConfigService: LocalConfigService,
  ollamaClientService: OllamaClientService,
  vllmClientService: VllmClientService
): IModelClient {
  // 从 ~/.sightai/config.json 读取 client_type
  const clientType = localConfigService.getClientType() as ClientType;

  console.log(`[ModelClientFactory] Creating client for type: ${clientType}`);

  switch (clientType) {
    case 'ollama':
      console.log('[ModelClientFactory] Using OllamaClientService');
      return ollamaClientService;

    case 'vllm':
      console.log('[ModelClientFactory] Using VllmClientService');
      return vllmClientService;

    default:
      console.warn(`[ModelClientFactory] Unknown client type: ${clientType}, defaulting to ollama`);
      return ollamaClientService;
  }
}

/**
 * 动态客户端提供者
 * 使用 NestJS 的 useFactory 模式根据配置动态选择客户端
 */
export const DynamicModelClientProvider: Provider = {
  provide: ACTIVE_MODEL_CLIENT,
  useFactory: createModelClientFactory,
  inject: [LocalConfigService, OllamaClientService, VllmClientService],
};

/**
 * 客户端类型验证函数
 */
export function isValidClientType(clientType: string): clientType is ClientType {
  return clientType === 'ollama' || clientType === 'vllm';
}

/**
 * 获取默认客户端类型
 */
export function getDefaultClientType(): ClientType {
  return 'ollama';
}

/**
 * 获取所有支持的客户端类型
 */
export function getSupportedClientTypes(): ClientType[] {
  return ['ollama', 'vllm'];
}
