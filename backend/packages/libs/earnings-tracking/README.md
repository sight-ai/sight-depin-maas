# @saito/earnings-tracking

收益跟踪模块，专门处理 API 调用的收益记录和任务跟踪。

## 功能特性

### 🎯 核心功能
- **API调用拦截**: 自动拦截所有推理API调用
- **任务生命周期跟踪**: 完整的任务创建→运行→完成/失败流程
- **收益计算**: 基于实际使用量（输入/输出tokens）计算收益
- **多框架支持**: 支持Ollama和vLLM框架
- **多协议支持**: 支持Ollama原生和OpenAI兼容协议

### 📊 收益配置
- **框架差异化费率**: 不同框架使用不同的收益费率
- **任务类型细分**: 按chat、generate、embeddings等任务类型计费
- **动态费率调整**: 支持运行时调整收益费率配置
- **时长奖励**: 对长时间运行的任务给予额外奖励

## 使用方法

### 模块导入
```typescript
import { EarningsTrackingModule } from '@saito/earnings-tracking';

@Module({
  imports: [
    EarningsTrackingModule,
    // 其他模块...
  ],
})
export class AppModule {}
```

### 拦截器使用
```typescript
import { EarningsTrackingInterceptor } from '@saito/earnings-tracking';

@Controller()
@UseInterceptors(EarningsTrackingInterceptor)
export class InferenceController {
  // API端点会自动被拦截和跟踪
}
```

### 配置服务使用
```typescript
import { EarningsConfigService } from '@saito/earnings-tracking';

@Injectable()
export class MyService {
  constructor(
    private readonly earningsConfig: EarningsConfigService
  ) {}

  checkEndpoint(url: string) {
    const isTrackable = this.earningsConfig.isTrackableEndpoint(url);
    const framework = this.earningsConfig.getFramework(url);
    const taskType = this.earningsConfig.getTaskType(url);
    
    return { isTrackable, framework, taskType };
  }
}
```

## 支持的端点

### Ollama 原生端点
- `/api/chat` - 聊天对话
- `/api/generate` - 文本生成
- `/api/embeddings` - 向量嵌入
- `/ollama/api/*` - Ollama代理端点

### OpenAI 兼容端点
- `/openai/chat/completions` - OpenAI聊天完成
- `/openai/completions` - OpenAI文本完成
- `/openai/embeddings` - OpenAI向量嵌入

## 收益费率配置

### Ollama 框架费率
```typescript
ollama: {
  chat: { input: 0.001, output: 0.002, base: 0.01 },
  generate: { input: 0.001, output: 0.002, base: 0.01 },
  embeddings: { input: 0.0005, output: 0, base: 0.005 },
  'chat/completions': { input: 0.001, output: 0.002, base: 0.01 }
}
```

### vLLM 框架费率
```typescript
vllm: {
  'chat/completions': { input: 0.0015, output: 0.003, base: 0.015 },
  'completions': { input: 0.0015, output: 0.003, base: 0.015 },
  'embeddings': { input: 0.0008, output: 0, base: 0.008 }
}
```

## 架构设计

### 组件结构
```
@saito/earnings-tracking/
├── src/
│   ├── lib/
│   │   ├── services/
│   │   │   └── earnings-config.service.ts    # 收益配置服务
│   │   ├── interceptors/
│   │   │   └── earnings-tracking.interceptor.ts # 收益跟踪拦截器
│   │   └── earnings-tracking.module.ts       # 模块定义
│   └── index.ts                              # 导出文件
```

### 依赖关系
- `@saito/miner` - 任务管理和收益记录
- `@saito/device-status` - 设备配置信息
- `@saito/model-inference-client` - 模型推理客户端

## 工作流程

### 1. API调用拦截
```
HTTP请求 → EarningsTrackingInterceptor → 检查是否可跟踪端点
```

### 2. 任务创建
```
创建TaskTracker → 调用TaskManager.createTask → 更新状态为'running'
```

### 3. 收益计算
```
API完成 → 提取tokens → 计算收益 → 记录到EarningsManager
```

### 4. 任务完成
```
更新任务状态 → 记录完成时间 → 日志输出收益信息
```

## 环境变量

- `MODEL_INFERENCE_FRAMEWORK` - 当前使用的推理框架 (ollama/vllm)

## 日志输出

### 成功完成
```
✅ Task completed: task_123456
💰 Earnings: 0.015000 tokens (ollama/chat)
📊 Breakdown: { inputReward: 0.005, outputReward: 0.008, baseReward: 0.01, durationBonus: 0.002 }
```

### 任务失败
```
❌ Task failed: task_123456 - Error message
```

## 性能特性

- **异步处理**: 所有收益跟踪操作都是异步的，不影响API响应时间
- **错误隔离**: 收益跟踪失败不会影响正常的API调用
- **内存优化**: 任务跟踪器使用最小内存占用
- **日志分级**: 支持debug、info、warn、error不同级别的日志输出
