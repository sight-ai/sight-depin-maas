# Model Inference Client

A unified client library for communicating with model inference frameworks that supports both Ollama and vLLM with runtime switching capability.

## Features

- **Framework Detection**: Automatic detection of available inference frameworks
- **Unified Interface**: Common API for both Ollama and vLLM frameworks
- **Runtime Switching**: Switch between frameworks without restarting the application
- **Environment-based Configuration**: Configure frameworks via environment variables
- **OpenAI-compatible APIs**: Leverage OpenAI-compatible protocols for both frameworks
- **Type Safety**: Full TypeScript support with Zod schema validation

## Quick Start

### Environment Configuration

Add these environment variables to your `.env` file:

```bash
# Framework selection: "ollama" | "vllm" | "auto"
MODEL_INFERENCE_FRAMEWORK="ollama"

# Framework URLs
OLLAMA_API_URL="http://127.0.0.1:11434/"
VLLM_API_URL="http://localhost:8000"

# Default model
OLLAMA_MODEL="deepscaler"
```

### Basic Usage

```typescript
import {
  FrameworkManagerService,
  ModelFramework
} from '@saito/model-inference-client';

// Get current service based on environment
const frameworkManager = new FrameworkManagerService();
const service = await frameworkManager.createFrameworkService();

// List models
const models = await service.listModels();
console.log(`Found ${models.models.length} models using ${frameworkManager.getCurrentFramework()}`);

// Chat completion
await service.chat({
  model: 'deepscaler',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true
}, response);

// Switch framework
await frameworkManager.switchFramework(ModelFramework.VLLM);
```

### Framework Detection

```typescript
import { FrameworkManagerService } from '@saito/model-inference-client';

const frameworkManager = new FrameworkManagerService();
const detection = await frameworkManager.detectFrameworks();

console.log(`Current framework: ${frameworkManager.getCurrentFramework()}`);
console.log(`Available frameworks: ${detection.available.join(', ')}`);
console.log(`Recommended framework: ${detection.recommended}`);
```

## CLI Usage

The framework provides CLI commands for framework management:

```bash
# Check framework status
sight framework status

# Switch framework
sight framework switch ollama
sight framework switch vllm --force

# Interactive CLI with framework options
sight cli
```

## API Endpoints

The unified API controller provides these endpoints:

- `GET /api/unified/framework/status` - Get framework status
- `POST /api/unified/framework/switch` - Switch framework
- `GET /api/unified/models` - List models
- `GET /api/unified/models/:name` - Get model info
- `POST /api/unified/chat` - Chat completion
- `POST /api/unified/complete` - Text completion
- `POST /api/unified/embeddings` - Generate embeddings
- `GET /api/unified/health` - Health check
- `GET /api/unified/version` - Get version

### Example API Usage

```bash
# Get framework status
curl http://localhost:8716/api/unified/framework/status

# Switch to vLLM
curl -X POST http://localhost:8716/api/unified/framework/switch \
  -H "Content-Type: application/json" \
  -d '{"framework": "vllm"}'

# List models using specific framework
curl http://localhost:8716/api/unified/models?framework=ollama

# Chat completion
curl -X POST http://localhost:8716/api/unified/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepscaler",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

## Architecture

### Components

1. **FrameworkManagerService**: Core service for framework detection, switching, and service creation
2. **OllamaClient**: Modern Ollama client implementation
3. **VllmClient**: Modern vLLM client implementation
4. **DynamicModelConfigService**: Dynamic model configuration and replacement
5. **IModelService**: Unified interface for all model operations

### Framework Support

| Framework | Status | Features |
|-----------|--------|----------|
| Ollama | ✅ Full | Chat, Completion, Embeddings, Models, Status |
| vLLM | ✅ Full | Chat, Completion, Embeddings, Models, Status |

### Design Patterns

- **Factory Pattern**: Service creation and management
- **Adapter Pattern**: Ollama service compatibility
- **Strategy Pattern**: Framework-specific implementations
- **Singleton Pattern**: Service caching and reuse

## Configuration

### Framework Selection

The framework is selected based on the `MODEL_INFERENCE_FRAMEWORK` environment variable:

- `"ollama"`: Use Ollama exclusively
- `"vllm"`: Use vLLM exclusively  
- `"auto"`: Auto-detect (prefers Ollama, falls back to vLLM)

### Fallback Behavior

When the primary framework is unavailable:

1. Check secondary framework availability
2. Switch to available framework automatically
3. Log warnings about framework unavailability
4. Throw error if no frameworks are available

## Error Handling

The framework provides comprehensive error handling:

- **Service Unavailable**: Graceful degradation and fallback
- **Network Errors**: Retry logic with exponential backoff
- **Invalid Requests**: Proper validation and error messages
- **Framework Switching**: Validation before switching

## Performance

- **Service Caching**: Reuse service instances across requests
- **Lazy Loading**: Load frameworks only when needed
- **Connection Pooling**: Efficient HTTP client usage
- **Detection Caching**: Cache framework detection results

## Testing

```bash
# Run framework tests
npm test -- --testPathPattern=model-framework

# Test specific framework
npm test -- --testNamePattern="Ollama"
npm test -- --testNamePattern="vLLM"
```

## Contributing

1. Follow existing code patterns and TypeScript conventions
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure backward compatibility

## License

MIT License - see LICENSE file for details.
