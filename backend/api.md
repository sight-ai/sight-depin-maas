# 设备端与网关对接API文档

本文档详细描述了设备端与网关服务器的API对接流程，主要包括设备注册和心跳上报两个核心功能。

## 1. 设备注册

设备首次连接需要通过一次性码进行注册，获取唯一的设备ID。

### 1.1 注册流程

1. 从管理平台获取一次性注册码
2. 收集设备信息（CPU、GPU、内存等）
3. 发送HTTP请求到网关注册接口
4. 保存返回的设备ID用于后续连接

### 1.2 注册API

**请求方式**：POST

**请求地址**：`https://api.sight-ai.com/api/node/register`

**请求头**：
```
Content-Type: application/json
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| code | string | 是 | 从管理平台获取的一次性注册码 |
| gateway_address | string | 是 | 网关地址 |
| reward_address | string | 是 | 奖励地址 |
| device_type | string | 否 | 设备类型，如"GPU"或"CPU" |
| gpu_type | string | 否 | GPU型号，如"NVIDIA RTX 3090" |
| ip | string | 否 | 设备IP地址 |

**请求示例**：
```json
{
  "code": "OTC12345",
  "gateway_address": "https://api.sight-ai.com",
  "reward_address": "0x1234567890abcdef",
  "device_type": "GPU",
  "gpu_type": "NVIDIA RTX 3090",
  "ip": "192.168.1.100"
}
```

**成功响应**：

```json
{
  "success": true,
  "data": {
    "node_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "connected",
    "device_type": "GPU",
    "reward_address": "0x1234567890abcdef"
  }
}
```

**错误响应**：

```json
{
  "success": false,
  "message": "无效的一次性注册码"
}
```

### 1.3 注册后的Socket连接

设备注册成功后，需要使用返回的设备ID建立Socket.IO连接：

1. 连接到网关Socket服务器
2. 发送注册事件，包含设备ID
3. 接收注册确认

**Socket连接地址**：`https://api.sight-ai.com`

**注册事件**：`register_device`

**注册事件数据**：
```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**注册确认事件**：`register_device_ack`

**注册确认数据**：
```json
{
  "success": true,
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 2. 心跳上报

设备需要定期向网关发送心跳包，报告设备状态和性能指标。

### 2.1 心跳上报流程

1. 设备每30秒收集一次系统指标
2. 通过HTTP POST请求发送心跳数据
3. 网关更新设备状态和性能指标

### 2.2 心跳上报API

**请求方式**：POST

**请求地址**：`https://api.sight-ai.com/api/node/heartbeat`

**请求头**：
```
Content-Type: application/json
```

**请求参数**：

| 字段名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| node_id | string | 是 | 设备ID |
| status | string | 是 | 设备状态，如"connected" |
| cpu_usage_percent | number | 否 | CPU使用率百分比 |
| ram_usage_percent | number | 否 | 内存使用率百分比 |
| gpu_usage_percent | number | 否 | GPU使用率百分比 |
| gpu_temperature | number | 否 | GPU温度（摄氏度） |
| network_in_kbps | number | 否 | 网络入站流量(kbps) |
| network_out_kbps | number | 否 | 网络出站流量(kbps) |
| uptime_seconds | number | 否 | 设备运行时间(秒) |
| model | string | 否 | 当前运行的AI模型 |

**心跳数据示例**：
```json
{
  "node_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "connected",
  "cpu_usage_percent": 25.5,
  "ram_usage_percent": 60.2,
  "gpu_usage_percent": 80.0,
  "gpu_temperature": 65.2,
  "network_in_kbps": 1024,
  "network_out_kbps": 512,
  "uptime_seconds": 3600,
  "model": "llama2-7b"
}
```

**成功响应**：

```json
{
  "success": true,
  "data": null
}
```

**错误响应**：

```json
{
  "success": false,
  "message": "Failed to update device heartbeat"
}
```

### 2.3 新版心跳上报API

系统还提供了一个新版的心跳上报API，支持更多设备信息。

**请求方式**：POST

**请求地址**：`https://api.sight-ai.com/api/node/heartbeat/new`

**请求头**：
```
Content-Type: application/json
```

**请求参数**：

| 字段名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| code | string | 是 | 设备注册码 |
| cpu_usage | number | 否 | CPU使用率百分比 |
| memory_usage | number | 否 | 内存使用率百分比 |
| gpu_usage | number | 否 | GPU使用率百分比 |
| ip | string | 否 | 设备IP地址 |
| timestamp | string | 否 | 时间戳 |
| type | string | 否 | 设备类型 |
| model | string | 否 | 当前运行的AI模型 |
| device_info | object | 否 | 设备详细信息 |

**device_info对象格式**：

| 字段名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| cpu_model | string | 否 | CPU型号 |
| cpu_cores | number | 否 | CPU核心数 |
| cpu_threads | number | 否 | CPU线程数 |
| ram_total | number | 否 | 总内存大小(GB) |
| gpu_model | string | 否 | GPU型号 |
| gpu_count | number | 否 | GPU数量 |
| gpu_memory | number | 否 | GPU内存大小(GB) |
| disk_total | number | 否 | 总磁盘大小(GB) |
| os_info | string | 否 | 操作系统信息 |

**心跳数据示例**：
```json
{
  "code": "OTC12345",
  "cpu_usage": 25.5,
  "memory_usage": 60.2,
  "gpu_usage": 80.0,
  "ip": "192.168.1.100",
  "timestamp": "1678901234",
  "type": "GPU",
  "model": "llama2-7b",
  "device_info": {
    "cpu_model": "Intel Core i9-12900K",
    "cpu_cores": 16,
    "cpu_threads": 24,
    "ram_total": 64,
    "gpu_model": "NVIDIA RTX 3090",
    "gpu_count": 1,
    "gpu_memory": 24,
    "disk_total": 1000,
    "os_info": "Ubuntu 22.04"
  }
}
```

**成功响应**：

```json
{
  "success": true,
  "data": null
}
```

### 2.4 心跳频率

- 推荐心跳间隔：30秒
- 最小心跳间隔：10秒
- 最大心跳间隔：60秒

**注意**：心跳包中的必填字段不能缺少，否则可能导致服务端更新设备状态失败。

## 3. 实现示例

### 3.1 设备注册示例代码

```javascript
const fetch = require('node-fetch');

async function registerDevice(oneTimeCode, gatewayAddress, rewardAddress) {
  try {
    console.log('正在注册设备...');

    // 使用一次性码进行设备注册
    const response = await fetch(`${gatewayAddress}/api/node/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: oneTimeCode,
        gateway_address: gatewayAddress,
        reward_address: rewardAddress,
        device_type: 'GPU',
        gpu_type: 'NVIDIA RTX 3090',
        ip: '192.168.1.100'
      })
    });

    if (!response.ok) {
      throw new Error(`设备注册失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('设备注册成功，设备ID:', result.data.node_id);
      return result.data.node_id;
    } else {
      console.error('设备注册失败:', result.message);
      return null;
    }
  } catch (error) {
    console.error('设备注册错误:', error);
    return null;
  }
}
```

### 3.2 心跳上报示例代码

```javascript
const fetch = require('node-fetch');
const si = require('systeminformation');

async function sendHeartbeat(gatewayAddress, deviceId) {
  try {
    // 获取系统指标
    const metrics = await getSystemMetrics();

    // 发送心跳包
    const response = await fetch(`${gatewayAddress}/api/node/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        node_id: deviceId,
        status: 'connected',
        cpu_usage_percent: metrics.cpuUsage,
        ram_usage_percent: metrics.ramUsage,
        gpu_usage_percent: metrics.gpuUsage,
        gpu_temperature: metrics.temperature,
        network_in_kbps: metrics.networkIn,
        network_out_kbps: metrics.networkOut,
        uptime_seconds: metrics.uptime,
        model: 'llama2-7b'
      })
    });

    if (!response.ok) {
      throw new Error(`心跳上报失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('心跳上报成功');
      return true;
    } else {
      console.error('心跳上报失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('心跳上报错误:', error);
    return false;
  }
}

async function getSystemMetrics() {
  try {
    // 获取CPU使用率
    const cpu = await si.currentLoad();
    const cpuUsage = cpu.currentLoad;

    // 获取内存使用率
    const mem = await si.mem();
    const ramUsage = (mem.used / mem.total) * 100;

    // 获取GPU使用率
    const gpu = await si.graphics();
    const gpuUsage = gpu.controllers[0]?.utilizationGpu || 0;
    const temperature = gpu.controllers[0]?.temperatureGpu || 0;

    // 获取网络使用情况
    const net = await si.networkStats();
    const networkIn = net[0]?.rx_sec / 1024 || 0; // kbps
    const networkOut = net[0]?.tx_sec / 1024 || 0; // kbps

    // 获取系统运行时间
    const uptime = os.uptime();

    return {
      cpuUsage,
      ramUsage,
      gpuUsage,
      temperature,
      networkIn,
      networkOut,
      uptime
    };
  } catch (error) {
    console.error('获取系统指标失败:', error);
    // 返回默认值
    return {
      cpuUsage: 0,
      ramUsage: 0,
      gpuUsage: 0,
      temperature: 0,
      networkIn: 0,
      networkOut: 0,
      uptime: 0
    };
  }
}

// 启动定时心跳
function startHeartbeat(gatewayAddress, deviceId, interval = 30000) {
  console.log('启动心跳...');

  setInterval(async () => {
    await sendHeartbeat(gatewayAddress, deviceId);
  }, interval);
}
```

### 3.3 Socket连接示例代码

```javascript
const { io } = require('socket.io-client');

function connectSocket(gatewayAddress, deviceId) {
  console.log('正在连接到服务器...');

  // 创建Socket连接
  const socket = io(gatewayAddress);

  socket.on('connect', () => {
    console.log('已连接到服务器');

    // 注册设备ID
    socket.emit('register_device', {
      deviceId: deviceId
    });

    socket.on('register_device_ack', (data) => {
      if (data.success) {
        console.log('设备注册成功');
      } else {
        console.error('设备注册失败:', data.error);
      }
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('与服务器断开连接:', reason);
  });

  return socket;
}
```

## 4. 常见问题与解决方案

### 4.1 设备注册失败

**问题**：设备注册时返回 401 或 "无效的一次性注册码" 错误。

**解决方案**：
- 确认一次性注册码是否正确输入
- 验证注册码是否已过期（通常有效期为24小时）
- 从管理平台获取新的一次性注册码

### 4.2 心跳上报失败

**问题**：心跳上报时出现错误。

**解决方案**：
- 确保心跳包中包含所有必要字段
- 验证字段值是否为 undefined 或 null
- 确保 node_id 字段值正确
- 添加数据验证逻辑，确保发送前数据完整

### 4.3 Socket连接断开

**问题**：Socket.IO 连接频繁断开。

**解决方案**：
- 实现指数退避重连机制
- 增加心跳频率
- 配置Socket.IO的重连参数：

```javascript
const socket = io(gatewayAddress, {
  reconnection: true,           // 启用自动重连
  reconnectionAttempts: Infinity, // 无限重试
  reconnectionDelay: 1000,      // 初始重连延迟1秒
  reconnectionDelayMax: 60000,  // 最大重连延迟60秒
  timeout: 20000,               // 连接超时20秒
});
```



## 5. Socket.IO 连接管理

### 5.1 建立Socket连接

设备端需要使用Socket.IO客户端库与服务端建立长连接，用于接收任务请求和发送心跳：

**Socket连接地址**：`https://api.sight-ai.com`

**连接示例**：
```javascript
const { io } = require('socket.io-client');

// 创建Socket连接
const socket = io('https://api.sight-ai.com');

// 监听连接事件
socket.on('connect', () => {
  console.log('已连接到Sight AI服务器');
  // 连接成功后注册设备
  registerDevice();
});

// 监听断开连接事件
socket.on('disconnect', (reason) => {
  console.log('与服务器断开连接:', reason);
  // 实现重连逻辑
  setTimeout(() => {
    console.log('尝试重新连接...');
    socket.connect();
  }, 5000);
});
```

### 5.2 设备注册

连接成功后，设备需要发送注册事件，将之前保存的设备ID发送给服务端：

```javascript
function registerDevice() {
  // 从配置文件读取设备ID
  const deviceId = CONFIG.deviceId;

  // 发送注册事件
  socket.emit('register_device', {
    deviceId: deviceId
  });

  // 监听注册确认事件
  socket.on('register_device_ack', (data) => {
    if (data.success) {
      console.log('设备注册成功');
      // 启动心跳
      startHeartbeat();
    } else {
      console.error('设备注册失败:', data.error);
      // 处理注册失败情况
    }
  });
}
```

### 5.3 断线重连机制

设备端需要实现可靠的断线重连机制，确保网络波动时能自动恢复连接：

```javascript
// 配置Socket.IO客户端重连选项
const socket = io('https://api.sight-ai.com', {
  reconnection: true,           // 启用自动重连
  reconnectionAttempts: Infinity, // 无限重试
  reconnectionDelay: 1000,      // 初始重连延迟1秒
  reconnectionDelayMax: 60000,  // 最大重连延迟60秒
  timeout: 20000,               // 连接超时20秒
});
```

## 6. 聊天API

设备端需要处理来自网关的聊天请求，包括Ollama、OpenAI和DeepSeek格式的请求。

### 6.1 接收聊天请求

设备端需要监听以下事件来接收聊天请求：

| 事件类型 | 说明 |
|---------|------|
| `chat_request_stream` | 流式聊天请求 |
| `openai_chat_request` | OpenAI格式聊天请求 |
| `generate_request_stream` | 流式生成请求 |
| `openai_completion_request` | OpenAI格式补全请求 |
| `openai_embedding_request` | OpenAI格式嵌入请求 |
| `deepseek_chat_request` | DeepSeek格式聊天请求 |

**监听示例**：

```javascript
// 监听聊天请求
socket.on('message', async (message) => {
  try {
    const parsedMessage = JSON.parse(message);
    const { type, taskId, data } = parsedMessage;
    
    console.log(`收到请求: ${type}, taskId: ${taskId}`);
    
    switch (type) {
      case 'chat_request_stream':
        await handleChatRequestStream(taskId, data);
        break;
      case 'openai_chat_request':
        await handleOpenAIChatRequest(taskId, data);
        break;
      case 'generate_request_stream':
        await handleGenerateRequestStream(taskId, data);
        break;
      case 'openai_completion_request':
        await handleOpenAICompletionRequest(taskId, data);
        break;
      case 'openai_embedding_request':
        await handleOpenAIEmbeddingRequest(taskId, data);
        break;
      case 'deepseek_chat_request':
        await handleDeepSeekChatRequest(taskId, data);
        break;
      case 'openai_models_request':
        await handleOpenAIModelsRequest(taskId);
        break;
      case 'openai_model_info_request':
        await handleOpenAIModelInfoRequest(taskId, data);
        break;
      case 'openai_version_request':
        await handleOpenAIVersionRequest(taskId);
        break;
      default:
        console.error(`未知请求类型: ${type}`);
    }
  } catch (error) {
    console.error('处理请求错误:', error);
  }
});
```

### 6.2 Ollama 聊天请求处理

Ollama格式的聊天请求是设备端直接处理的基础格式。

**请求格式**：

```json
{
  "model": "llama2",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "stream": true,
  "options": {
    "temperature": 0.7,
    "top_p": 1.0,
    "num_predict": 2048
  }
}
```

**处理示例**：

```javascript
async function handleChatRequestStream(taskId, data) {
  const startTime = performance.now();

  try {
    console.log(`处理聊天请求, taskId: ${taskId}`);

    // 调用本地Ollama API
    const response = await fetch(`${CONFIG.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Ollama API错误: ${response.status} ${response.statusText}`);
    }

    // 处理流式响应
    if (data.stream) {
      const reader = response.body.getReader();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const jsonData = JSON.parse(line);
              
              // 发送响应给网关
              socket.emit('task_stream', {
                taskId,
                message: jsonData
              });
            } catch (e) {
              console.error('解析JSON错误:', e);
            }
          }
        }
      }

      // 发送完成信号
      socket.emit('task_stream', {
        taskId,
        message: { done: true }
      });
    } else {
      // 非流式响应
      const result = await response.json();
      
      // 发送响应给网关
      socket.emit('task_response', {
        taskId,
        message: result
      });
    }

    const endTime = performance.now();
    console.log(`请求处理完成, 耗时: ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.error('处理聊天请求错误:', error);

    // 发送错误响应
    socket.emit('task_error', {
      taskId,
      error: error.message
    });
  }
}
```

### 6.3 OpenAI 聊天请求处理

OpenAI格式的请求需要转换为Ollama格式处理，然后将Ollama的响应转换回OpenAI格式。

**请求格式**：

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
```

**处理示例**：

```javascript
async function handleOpenAIChatRequest(taskId, data) {
  try {
    console.log(`处理OpenAI聊天请求, taskId: ${taskId}`);

    // 转换为Ollama格式
    const ollamaRequest = {
      model: mapOpenAIModelToOllama(data.model),
      messages: data.messages,
      stream: data.stream,
      options: {
        temperature: data.temperature || 0.7,
        top_p: data.top_p || 1.0,
        num_predict: data.max_tokens || 2048
      }
    };

    // 调用本地Ollama API
    const response = await fetch(`${CONFIG.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ollamaRequest)
    });

    if (!response.ok) {
      throw new Error(`Ollama API错误: ${response.status} ${response.statusText}`);
    }

    // 处理流式响应
    if (data.stream) {
      const reader = response.body.getReader();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const ollamaChunk = JSON.parse(line);
              
              // 转换为OpenAI格式
              const openaiChunk = convertOllamaStreamToOpenAIStream(ollamaChunk, data.model);
              
              // 发送响应给网关
              socket.emit('task_stream', {
                taskId,
                message: JSON.stringify(openaiChunk)
              });
            } catch (e) {
              console.error('解析JSON错误:', e);
            }
          }
        }
      }

      // 发送完成信号
      socket.emit('task_stream', {
        taskId,
        message: JSON.stringify({
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: data.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }
          ]
        })
      });
    } else {
      // 非流式响应
      const ollamaResult = await response.json();
      
      // 转换为OpenAI格式
      const openaiResult = convertOllamaToOpenAI(ollamaResult, data.model);
      
      // 发送响应给网关
      socket.emit('task_response', {
        taskId,
        message: openaiResult
      });
    }
  } catch (error) {
    console.error('处理OpenAI聊天请求错误:', error);

    // 发送错误响应
    socket.emit('task_error', {
      taskId,
      error: error.message
    });
  }
}

// 辅助函数：将OpenAI模型映射到Ollama模型
function mapOpenAIModelToOllama(openaiModel) {
  const modelMap = {
    'gpt-3.5-turbo': 'llama2',
    'gpt-4': 'llama2',
    'text-davinci-003': 'llama2',
    // 添加更多映射...
  };
  
  return modelMap[openaiModel] || 'llama2'; // 默认使用llama2
}

// 辅助函数：将Ollama流转换为OpenAI流格式
function convertOllamaStreamToOpenAIStream(ollamaChunk, model) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        delta: {
          content: ollamaChunk.message?.content || ''
        },
        finish_reason: ollamaChunk.done ? 'stop' : null
      }
    ]
  };
}

// 辅助函数：将Ollama响应转换为OpenAI响应格式
function convertOllamaToOpenAI(ollamaResponse, model) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: ollamaResponse.message?.content || ''
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: ollamaResponse.prompt_eval_count || 0,
      completion_tokens: ollamaResponse.eval_count || 0,
      total_tokens: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0)
    }
  };
}
```

### 6.4 DeepSeek 聊天请求处理

DeepSeek格式的请求也需要转换为Ollama格式处理，然后将Ollama的响应转换回DeepSeek格式。

**请求格式**：

```json
{
  "model": "deepseek-llm",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "top_p": 1.0,
  "max_tokens": 2048,
  "stream": true
}
```

**处理示例**：

```javascript
async function handleDeepSeekChatRequest(taskId, data) {
  try {
    console.log(`处理DeepSeek聊天请求, taskId: ${taskId}`);

    // 转换为Ollama格式
    const ollamaRequest = {
      model: mapDeepSeekModelToOllama(data.model),
      messages: data.messages,
      stream: data.stream,
      options: {
        temperature: data.temperature || 0.7,
        top_p: data.top_p || 1.0,
        num_predict: data.max_tokens || 2048
      }
    };

    // 调用本地Ollama API
    const response = await fetch(`${CONFIG.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ollamaRequest)
    });

    if (!response.ok) {
      throw new Error(`Ollama API错误: ${response.status} ${response.statusText}`);
    }

    // 处理流式响应
    if (data.stream) {
      const reader = response.body.getReader();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const ollamaChunk = JSON.parse(line);
              
              // 转换为DeepSeek格式
              const deepseekChunk = convertOllamaStreamToDeepSeekStream(ollamaChunk, data.model);
              
              // 发送响应给网关
              socket.emit('task_stream', {
                taskId,
                message: JSON.stringify(deepseekChunk)
              });
            } catch (e) {
              console.error('解析JSON错误:', e);
            }
          }
        }
      }

      // 发送完成信号
      socket.emit('task_stream', {
        taskId,
        message: JSON.stringify({
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: data.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }
          ]
        })
      });
    } else {
      // 非流式响应
      const ollamaResult = await response.json();
      
      // 转换为DeepSeek格式
      const deepseekResult = convertOllamaToDeepSeek(ollamaResult, data.model);
      
      // 发送响应给网关
      socket.emit('task_response', {
        taskId,
        message: deepseekResult
      });
    }
  } catch (error) {
    console.error('处理DeepSeek聊天请求错误:', error);

    // 发送错误响应
    socket.emit('task_error', {
      taskId,
      error: error.message
    });
  }
}

// 辅助函数：将DeepSeek模型映射到Ollama模型
function mapDeepSeekModelToOllama(deepseekModel) {
  const modelMap = {
    'deepseek-llm': 'llama2',
    'deepseek-coder': 'codellama',
    // 添加更多映射...
  };
  
  return modelMap[deepseekModel] || 'llama2'; // 默认使用llama2
}

// 辅助函数：将Ollama流转换为DeepSeek流格式
function convertOllamaStreamToDeepSeekStream(ollamaChunk, model) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        delta: {
          content: ollamaChunk.message?.content || ''
        },
        finish_reason: ollamaChunk.done ? 'stop' : null
      }
    ]
  };
}

// 辅助函数：将Ollama响应转换为DeepSeek响应格式
function convertOllamaToDeepSeek(ollamaResponse, model) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: ollamaResponse.message?.content || ''
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: ollamaResponse.prompt_eval_count || 0,
      completion_tokens: ollamaResponse.eval_count || 0,
      total_tokens: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0)
    }
  };
}
```

## 7. 模型管理API

设备端需要处理模型列表和模型信息请求。

### 7.1 获取模型列表

**事件类型**：`openai