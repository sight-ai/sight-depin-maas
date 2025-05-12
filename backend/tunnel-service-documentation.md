# Tunnel Service 对接文档

## 1. 概述

Tunnel Service（隧道服务）是 Sight AI 系统中负责设备与网关之间通信的核心组件。它基于 WebSocket 技术，提供了实时、双向的通信能力，使设备能够接收任务请求并返回处理结果。

### 1.1 主要功能

- **设备注册与连接管理**：管理设备的注册和连接状态
- **消息传递**：在网关和设备之间传递消息
- **任务处理**：处理设备的任务请求和响应
- **流式数据传输**：支持流式数据传输，适用于大型响应和实时生成场景

### 1.2 系统架构

```
+----------------+                  +----------------+                  +----------------+
|                |                  |                |                  |                |
|    客户端      | <-- HTTP/API --> |     网关       | <-- WebSocket --> |    设备端      |
|                |                  |                |                  |                |
+----------------+                  +----------------+                  +----------------+
                                          |
                                          | 使用 TunnelService
                                          v
                                    +----------------+
                                    |                |
                                    |   其他服务     |
                                    |  (Chat, Node等)|
                                    |                |
                                    +----------------+
```

## 2. 接口定义

### 2.1 TunnelService 接口

TunnelService 提供以下核心方法：

```typescript
interface TunnelService {
  /**
   * 向设备发送消息
   * @param params 发送消息的参数
   */
  handleSendToDevice(params: { deviceId: string; message: string }): Promise<void>;

  /**
   * 为任务注册流式处理器
   * @param params 注册流式处理器的参数
   */
  handleRegisterStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<void>;
  }): Promise<void>;

  /**
   * 为任务注册非流式处理器
   * @param params 注册非流式处理器的参数
   */
  handleRegisterNoStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<any>;
  }): Promise<void>;

  /**
   * 获取所有已连接设备
   * @returns 已连接设备ID列表
   */
  getConnectedDevices(): Promise<string[]>;

  /**
   * 检查设备是否已连接
   * @param deviceId 设备ID
   * @returns 设备是否已连接
   */
  isDeviceConnected(deviceId: string): Promise<boolean>;
}
```

## 3. WebSocket 事件

### 3.1 服务端事件（网关发送到设备）

| 事件名称 | 描述 | 数据格式 |
|---------|------|---------|
| `task_request` | 向设备发送任务请求 | `{ message: string }` |
| `register_device_ack` | 设备注册确认 | `{ success: boolean, deviceId?: string, error?: string }` |

### 3.2 客户端事件（设备发送到网关）

| 事件名称 | 描述 | 数据格式 |
|---------|------|---------|
| `register_device` | 设备注册请求 | `{ deviceId: string }` |
| `task_response` | 任务响应（非流式） | `{ taskId: string, message: any }` |
| `task_stream` | 任务流式响应 | `{ taskId: string, message: string }` |
| `task_error` | 任务处理错误 | `{ taskId: string, error: string }` |

## 4. 通信流程

### 4.1 设备注册流程

```
设备                                                网关
 |                                                  |
 |--- register_device { deviceId: "device123" } --->|
 |                                                  | 存储设备映射
 |<-- register_device_ack { success: true } --------|
 |                                                  |
```

### 4.2 任务处理流程（非流式）

```
网关                                                设备
 |                                                  |
 |--- task_request { message: "..." } ------------->|
 |                                                  | 处理任务
 |<-- task_response { taskId: "...", message: ... }-|
 |                                                  |
```

### 4.3 任务处理流程（流式）

```
网关                                                设备
 |                                                  |
 |--- task_request { message: "..." } ------------->|
 |                                                  | 处理任务
 |<-- task_stream { taskId: "...", message: ... }---|
 |<-- task_stream { taskId: "...", message: ... }---|
 |<-- task_stream { taskId: "...", message: ... }---|
 |                                                  |
```

## 5. 消息格式

### 5.1 任务请求消息格式

任务请求消息通过 `task_request` 事件发送，格式如下：

```json
{
  "message": "{\"type\":\"chat_request_stream\",\"taskId\":\"task123\",\"data\":{...}}"
}
```

其中 `message` 是一个 JSON 字符串，包含以下字段：

- `type`: 任务类型，如 `chat_request_stream`、`generate_request_stream` 等
- `taskId`: 任务 ID，用于标识任务
- `data`: 任务数据，根据任务类型不同而不同

### 5.2 任务响应消息格式（非流式）

非流式任务响应通过 `task_response` 事件发送，格式如下：

```json
{
  "taskId": "task123",
  "message": {
    // 响应数据，根据任务类型不同而不同
  }
}
```

### 5.3 任务响应消息格式（流式）

流式任务响应通过 `task_stream` 事件发送，格式如下：

```json
{
  "taskId": "task123",
  "message": "..."  // 流式响应数据，通常是 JSON 字符串
}
```

## 6. 任务类型

Tunnel Service 支持以下任务类型：

| 任务类型 | 描述 | 流式 |
|---------|------|------|
| `chat_request_stream` | Ollama 聊天请求（流式） | 是 |
| `chat_request_no_stream` | Ollama 聊天请求（非流式） | 否 |
| `generate_request_stream` | Ollama 生成请求（流式） | 是 |
| `generate_request_no_stream` | Ollama 生成请求（非流式） | 否 |
| `model_list_request` | 获取模型列表 | 否 |
| `model_info_request` | 获取模型信息 | 否 |
| `openai_chat_request` | OpenAI 聊天请求 | 可选 |
| `openai_completion_request` | OpenAI 补全请求 | 可选 |
| `openai_embedding_request` | OpenAI 嵌入请求 | 否 |
| `openai_model_info_request` | OpenAI 模型信息请求 | 否 |
| `openai_version_request` | OpenAI 版本请求 | 否 |
| `deepseek_chat_request` | DeepSeek 聊天请求 | 可选 |

## 7. 实现示例

### 7.1 设备端实现示例

```javascript
const { io } = require('socket.io-client');

// 创建 Socket 连接
const socket = io('https://api.sight-ai.com', {
  path: '/api/socket.io',
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 60000,
  timeout: 20000,
  transports: ['polling', 'websocket'],
  extraHeaders: {
    'Authorization': `Bearer ${key}`
  }
});

// 连接成功
socket.on('connect', () => {
  console.log('已连接到服务器');
  
  // 注册设备
  socket.emit('register_device', { deviceId: 'device123' });
});

// 注册确认
socket.on('register_device_ack', (data) => {
  if (data.success) {
    console.log(`设备注册成功: ${data.deviceId}`);
  } else {
    console.error(`设备注册失败: ${data.error}`);
  }
});

// 任务请求
socket.on('task_request', async (data) => {
  try {
    const { message } = data;
    const parsedMessage = JSON.parse(message);
    const { type, taskId, data: taskData } = parsedMessage;
    
    console.log(`收到任务请求: ${type}, taskId: ${taskId}`);
    
    // 处理任务
    switch (type) {
      case 'chat_request_stream':
        await handleChatRequestStream(taskId, taskData);
        break;
      case 'chat_request_no_stream':
        await handleChatRequestNoStream(taskId, taskData);
        break;
      // 处理其他任务类型...
      default:
        console.error(`未知任务类型: ${type}`);
    }
  } catch (error) {
    console.error('处理任务请求错误:', error);
  }
});

// 处理流式聊天请求
async function handleChatRequestStream(taskId, data) {
  try {
    // 调用 Ollama API 处理请求
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    // 处理流式响应
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
            const responseData = JSON.parse(line);
            
            // 发送流式响应
            socket.emit('task_stream', {
              taskId,
              message: line
            });
          } catch (e) {
            console.error('解析 JSON 错误:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('处理聊天请求错误:', error);
    
    // 发送错误响应
    socket.emit('task_error', {
      taskId,
      error: error.message
    });
  }
}

// 处理非流式聊天请求
async function handleChatRequestNoStream(taskId, data) {
  try {
    // 调用 Ollama API 处理请求
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const responseData = await response.json();
    
    // 发送非流式响应
    socket.emit('task_response', {
      taskId,
      message: responseData
    });
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

### 7.2 网关端使用示例

```typescript
import { Injectable } from '@nestjs/common';
import { TunnelService } from '@saito/tunnel';

@Injectable()
export class ChatService {
  constructor(private readonly tunnelService: TunnelService) {}
  
  async handleChatRequest(req, res) {
    // 获取空闲节点
    const idleNode = await this.getIdleNode();
    const taskId = `chat-${Date.now()}`;
    
    // 注册流式处理器
    await this.tunnelService.handleRegisterStreamHandler({
      taskId,
      targetDeviceId: idleNode.node_id,
      onMessage: async (message) => {
        // 将消息发送给客户端
        res.write(`data: ${JSON.stringify(message)}\n\n`);
        return Promise.resolve();
      }
    });
    
    // 向设备发送任务请求
    await this.tunnelService.handleSendToDevice({
      deviceId: idleNode.node_id,
      message: JSON.stringify({
        type: 'chat_request_stream',
        taskId,
        data: req.body
      })
    });
  }
  
  async handleNonStreamChatRequest(req) {
    // 获取空闲节点
    const idleNode = await this.getIdleNode();
    const taskId = `chat-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      // 注册非流式处理器
      this.tunnelService.handleRegisterNoStreamHandler({
        taskId,
        targetDeviceId: idleNode.node_id,
        onMessage: async (response) => {
          if (response.error) {
            reject(response.error);
          } else {
            resolve(response);
          }
          return Promise.resolve();
        }
      });
      
      // 向设备发送任务请求
      this.tunnelService.handleSendToDevice({
        deviceId: idleNode.node_id,
        message: JSON.stringify({
          type: 'chat_request_no_stream',
          taskId,
          data: req.body
        })
      });
    });
  }
}
```

## 8. 错误处理

### 8.1 常见错误

| 错误类型 | 描述 | 处理方法 |
|---------|------|---------|
| 连接错误 | 无法连接到服务器 | 实现重连机制，指数退避重试 |
| 注册错误 | 设备注册失败 | 检查设备 ID 是否有效，重试注册 |
| 任务处理错误 | 处理任务时出错 | 发送 `task_error` 事件，包含错误信息 |
| 消息解析错误 | 无法解析消息 | 检查消息格式，确保是有效的 JSON |

### 8.2 错误响应格式

```json
{
  "taskId": "task123",
  "error": "错误信息"
}
```

## 9. 最佳实践

1. **实现可靠的重连机制**：设备应实现可靠的断线重连机制，确保长时间稳定连接。

2. **处理并发任务**：设备应能够处理多个并发任务，合理分配资源。

3. **错误处理**：妥善处理各种错误情况，确保系统稳定性。

4. **性能监控**：监控任务处理性能，及时发现并解决性能问题。

5. **安全性**：确保通信安全，使用 TLS 加密和适当的认证机制。

## 10. 附录

### 10.1 相关资源

- [Socket.IO 官方文档](https://socket.io/docs/v4/)
- [Ollama API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)

### 10.2 术语表

- **TunnelService**：隧道服务，负责设备与网关之间的通信
- **WebSocket**：一种网络传输协议，提供全双工通信通道
- **Socket.IO**：一个基于 WebSocket 的库，提供实时、双向的通信能力
- **流式响应**：将响应分成多个小块逐步发送，适用于大型响应和实时生成场景
- **任务处理器**：处理特定任务的函数或方法
- **设备 ID**：唯一标识设备的 ID
- **任务 ID**：唯一标识任务的 ID
