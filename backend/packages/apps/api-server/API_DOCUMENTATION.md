# 📚 SightAI API Server Documentation

## 🎯 概述

SightAI API Server 提供了完整的 AI 模型推理、设备管理、挖矿操作和系统监控的 API 接口。本文档基于 OpenAPI 3.0.3 规范，提供了详细的接口说明和使用示例。

## 📋 API 文档

### 📄 OpenAPI 规范文件
- **文件位置**: `backend/packages/apps/api-server/openapi.yaml`
- **格式**: OpenAPI 3.0.3
- **内容**: 完整的 API 接口定义、请求/响应模式和示例

### 🌐 在线文档查看

#### 1. Swagger UI
```bash
# 安装 swagger-ui-serve
npm install -g swagger-ui-serve

# 启动文档服务器
swagger-ui-serve openapi.yaml
```

#### 2. Redoc
```bash
# 安装 redoc-cli
npm install -g redoc-cli

# 生成静态文档
redoc-cli build openapi.yaml --output api-docs.html
```

#### 3. 在线工具
- [Swagger Editor](https://editor.swagger.io/) - 在线编辑和预览
- [Redoc Demo](https://redocly.github.io/redoc/) - 在线文档预览

## 🔗 API 端点分类

### 1. 🏥 Health & Status
- `GET /` - 应用信息
- `GET /healthz` - 简单健康检查
- `GET /api/v1/health` - 详细健康信息

### 2. 🤖 OpenAI Compatible
- `POST /openai/v1/chat/completions` - 聊天补全
- `POST /openai/v1/completions` - 文本补全
- `GET /openai/v1/models` - 模型列表
- `POST /openai/v1/embeddings` - 文本嵌入

### 3. 🦙 Ollama Compatible
- `POST /ollama/api/chat` - Ollama 聊天
- `POST /ollama/api/generate` - Ollama 生成
- `GET /ollama/api/tags` - Ollama 模型列表
- `POST /ollama/api/embeddings` - Ollama 嵌入

### 4. 📊 Dashboard
- `GET /api/v1/dashboard/statistics` - 仪表板统计
- `GET /api/v1/dashboard/task-count` - 任务计数
- `GET /api/v1/dashboard/task-activity` - 任务活动
- `GET /api/v1/dashboard/task-trends` - 任务趋势
- `GET /api/v1/dashboard/earnings` - 收益数据

### 5. 📱 Device Management
- `GET /api/v1/device-status` - 设备状态
- `POST /api/v1/device-status` - 设备注册
- `GET /api/v1/device-status/gateway-status` - 网关状态
- `POST /api/v1/device-status/update-did` - 更新 DID
- `GET /api/v1/device-status/did-info` - DID 信息

### 6. ⛏️ Mining
- `GET /api/v1/miner/summary` - 挖矿摘要
- `GET /api/v1/miner/history` - 任务历史
- `GET /api/v1/miner/connect-task-list` - 连接任务列表

### 7. ⚙️ Configuration
- `GET /api/v1/config/current` - 当前配置
- `POST /api/v1/config/switch-framework` - 切换框架
- `PUT /api/v1/config/vllm` - 更新 vLLM 配置
- `PUT /api/v1/config/generic` - 更新通用配置

### 8. 🔧 Models
- `GET /api/v1/models/list` - 模型列表
- `POST /api/v1/models/report` - 报告模型

## 🚀 使用示例

### OpenAI 兼容聊天
```bash
curl -X POST http://localhost:3000/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "temperature": 0.7,
    "max_tokens": 150
  }'
```

### 获取仪表板统计
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/statistics?timeRange=%7B%22request_serials%22%3A%22daily%22%2C%22filteredTaskActivity%22%3A%7B%7D%7D"
```

### 设备注册
```bash
curl -X POST http://localhost:3000/api/v1/device-status \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-001",
    "deviceInfo": {
      "name": "AI Worker Node",
      "type": "inference",
      "capabilities": ["chat", "completion", "embedding"]
    }
  }'
```

### 切换推理框架
```bash
curl -X POST http://localhost:3000/api/v1/config/switch-framework \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "vllm"
  }'
```

## 📝 响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    // 具体数据内容
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误描述",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔐 认证与安全

### 当前状态
- 目前 API 不需要认证
- 适用于本地开发和内部网络

### 未来计划
- API Key 认证
- JWT Token 支持
- Rate Limiting
- CORS 配置

## 📊 数据模型

### 核心实体
- **Task**: 任务实体，包含状态、类型、收益等信息
- **Device**: 设备实体，包含状态、能力、连接信息
- **Model**: AI 模型实体，包含名称、大小、详情
- **Configuration**: 配置实体，支持多种配置类型

### 状态枚举
- **Task Status**: `pending`, `running`, `completed`, `failed`
- **Device Status**: `online`, `offline`, `maintenance`
- **Framework**: `ollama`, `vllm`

## 🛠️ 开发工具

### 代码生成
```bash
# 生成 TypeScript 客户端
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./generated/typescript-client

# 生成 Python 客户端
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./generated/python-client
```

### 验证工具
```bash
# 安装 swagger-codegen
npm install -g swagger-codegen

# 验证 OpenAPI 规范
swagger-codegen validate -i openapi.yaml
```

### 测试工具
```bash
# 使用 Newman 进行 API 测试
npm install -g newman

# 从 OpenAPI 生成 Postman 集合
# 然后使用 Newman 运行测试
```

## 📈 版本管理

### 当前版本
- **API Version**: v1.0.0
- **OpenAPI Version**: 3.0.3
- **最后更新**: 2024-01-01

### 版本策略
- **主版本**: 破坏性变更
- **次版本**: 新功能添加
- **修订版本**: Bug 修复和小改进

## 🤝 贡献指南

### 更新 API 文档
1. 修改 `openapi.yaml` 文件
2. 验证 OpenAPI 规范
3. 更新相关示例和说明
4. 提交 Pull Request

### 添加新端点
1. 在控制器中实现新端点
2. 在 `openapi.yaml` 中添加端点定义
3. 添加相应的 Schema 定义
4. 更新文档和示例

## 📞 支持与反馈

### 问题报告
- GitHub Issues: [项目仓库](https://github.com/your-org/sight-ai)
- 邮箱: support@sight.ai

### 文档改进
- 欢迎提交文档改进建议
- 可以通过 Pull Request 贡献示例代码
- 报告文档中的错误或不准确之处

## 🔗 相关链接

- [OpenAPI 规范](https://spec.openapis.org/oas/v3.0.3)
- [Swagger 工具](https://swagger.io/tools/)
- [Redoc 文档](https://redocly.com/redoc/)
- [API 设计最佳实践](https://restfulapi.net/)

---

📝 **注意**: 此文档会随着 API 的更新而持续维护，请定期查看最新版本。
