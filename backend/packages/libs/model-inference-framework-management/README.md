# Model Inference Framework Management

A dedicated module for managing model inference framework processes, including Ollama and vLLM process lifecycle management, GPU resource control, and framework switching capabilities.

## Features

- **Process Management**: Start, stop, and restart Ollama and vLLM services
- **GPU Resource Control**: Manage GPU memory utilization and device allocation
- **Framework Switching**: Switch between different inference frameworks
- **Status Monitoring**: Monitor framework process status and health
- **Configuration Management**: Handle framework-specific configurations

## Architecture

This module is separated from the client module to maintain clear separation of concerns:

- **Client Module** (`@saito/model-inference-client`): Handles communication with inference services
- **Management Module** (`@saito/model-inference-framework-management`): Handles process and framework management

## Services

### FrameworkSwitchService

Core service for managing framework switching and coordination.

```typescript
import { FrameworkSwitchService } from '@saito/model-inference-framework-management';

// Switch to a framework
await frameworkSwitchService.switchToFramework('ollama', {
  force: false,
  validateAvailability: true,
  stopOthers: true
});

// Start a framework
await frameworkSwitchService.startFramework('vllm', {
  model: 'deepscaler',
  gpuMemoryUtilization: 0.8,
  maxModelLen: 4096,
  port: 8000,
  host: '0.0.0.0'
});

// Get framework status
const status = await frameworkSwitchService.getFrameworkStatus('ollama');
```

### VllmProcessManagerService

Manages vLLM process lifecycle with GPU configuration.

```typescript
import { VllmProcessManagerService } from '@saito/model-inference-framework-management';

const vllmManager = new VllmProcessManagerService();

// Start vLLM with GPU configuration
await vllmManager.startVllmService({
  model: 'deepscaler',
  gpuMemoryUtilization: 0.8,
  maxModelLen: 4096,
  port: 8000,
  host: '0.0.0.0'
});

// Monitor status
const status = await vllmManager.getVllmStatus();
console.log(`vLLM running: ${status.isRunning}, PID: ${status.pid}`);
```

### OllamaProcessManagerService

Manages Ollama process lifecycle.

```typescript
import { OllamaProcessManagerService } from '@saito/model-inference-framework-management';

const ollamaManager = new OllamaProcessManagerService();

// Start Ollama service
await ollamaManager.startOllamaService();

// Restart with new configuration
await ollamaManager.restartOllamaService();
```

## Usage

### Basic Framework Management

```typescript
import { 
  FrameworkSwitchService,
  ModelInferenceFrameworkManagementModule 
} from '@saito/model-inference-framework-management';

@Module({
  imports: [ModelInferenceFrameworkManagementModule],
  // ...
})
export class AppModule {}

// In your service
@Injectable()
export class MyService {
  constructor(
    private readonly frameworkSwitch: FrameworkSwitchService
  ) {}

  async switchToOllama() {
    const result = await this.frameworkSwitch.switchToFramework('ollama', {
      stopOthers: true,
      validateAvailability: false
    });
    
    if (result.success) {
      console.log('Successfully switched to Ollama');
    } else {
      console.error('Failed to switch:', result.message);
    }
  }
}
```

### GPU Resource Management

```typescript
// Configure vLLM with specific GPU settings
await frameworkSwitchService.startFramework('vllm', {
  model: 'deepscaler',
  gpuMemoryUtilization: 0.7,  // Use 70% of GPU memory
  maxModelLen: 8192,          // Maximum sequence length
  port: 8000,
  host: '0.0.0.0'
});
```

### Process Monitoring

```typescript
// Get status of all frameworks
const allStatuses = await frameworkSwitchService.getAllFrameworksStatus();

console.log('Ollama status:', allStatuses.ollama);
console.log('vLLM status:', allStatuses.vllm);

// Check specific framework
const ollamaStatus = await frameworkSwitchService.getFrameworkStatus('ollama');
if (ollamaStatus.isRunning) {
  console.log(`Ollama is running on PID ${ollamaStatus.pid}`);
  console.log(`Memory usage: ${ollamaStatus.memoryUsage}MB`);
  console.log(`CPU usage: ${ollamaStatus.cpuUsage}%`);
}
```

## Configuration

The module supports various configuration options for different frameworks:

### vLLM Configuration

```typescript
interface VllmProcessConfig {
  model: string;                // Model name/path
  gpuMemoryUtilization: number; // 0.0 - 1.0
  maxModelLen: number;          // Maximum sequence length
  port: number;                 // Server port
  host: string;                 // Server host
}
```

### Ollama Configuration

```typescript
interface OllamaProcessConfig {
  // Ollama uses default configuration
  // Additional options can be added as needed
}
```

## Error Handling

All services provide comprehensive error handling with detailed error messages:

```typescript
const result = await frameworkSwitchService.switchToFramework('vllm');

if (!result.success) {
  console.error('Switch failed:', result.message);
  // Handle error appropriately
}
```

## Integration

This module is designed to work alongside the client module:

1. Use this module for process management and framework switching
2. Use the client module for actual inference requests
3. The modules can be used independently or together

## Contributing

When adding new framework support:

1. Create a new process manager service
2. Add framework support to FrameworkSwitchService
3. Update the module exports
4. Add appropriate tests
