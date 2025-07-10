# 🚨 缺失的 API 接口清单

## 📋 概述

在对接 desktop-app 页面与 API 服务器的过程中，发现以下接口在当前的 OpenAPI 文档中缺失，但在前端页面中被使用。这些接口需要在后端实现。

## ❌ 缺失的接口列表

### 1. 📊 Dashboard 页面 - 已完全对接 ✅

#### ✅ `/api/app/system-resources` - 已存在并对接
- **方法**: GET
- **状态**: ✅ 已实现并对接
- **控制器**: `AppConfigController.getSystemResources()`
- **用途**: 获取系统资源使用情况（CPU、内存、GPU、网络）

#### ✅ `/api/app/status` - 已存在并对接
- **方法**: GET
- **状态**: ✅ 已实现并对接
- **控制器**: `AppConfigController.getAppStatus()`
- **用途**: 获取应用状态和框架信息

#### ✅ `/api/v1/dashboard/statistics` - 已存在并对接
- **方法**: GET
- **状态**: ✅ 已实现并对接
- **控制器**: `DashboardController.getDashboardStatistics()`
- **用途**: 获取仪表板统计数据

### 2. 💬 Communication 页面缺失接口

#### `/api/v1/communication/status`
- **方法**: GET
- **用途**: 获取通信服务状态
- **当前使用位置**: `Communication.tsx:105`
- **期望响应**:
```json
{
  "success": true,
  "data": {
    "libp2pService": true,
    "serviceStatus": "running",
    "availableToClaim": 12,
    "gatewayConnections": 3
  }
}
```

#### `/api/v1/communication/peer-info`
- **方法**: GET
- **用途**: 获取本地节点信息
- **当前使用位置**: `Communication.tsx:117`
- **期望响应**:
```json
{
  "success": true,
  "data": {
    "peerId": "ABC123DEF456",
    "listeningAddress": "/ip4/0.0.0.0/tcp/4001"
  }
}
```

#### `/api/v1/communication/peers`
- **方法**: GET
- **用途**: 获取已连接的节点列表
- **当前使用位置**: `Communication.tsx:140`
- **期望响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "type": "Gateway Node",
      "peerId": "12D3KooWGateway...",
      "status": "connected",
      "latency": "15 ms"
    }
  ]
}
```

#### `/api/v1/communication/test-message`
- **方法**: POST
- **用途**: 发送测试消息
- **当前使用位置**: `Communication.tsx:215`
- **请求体**:
```json
{
  "message": "Test message content"
}
```
- **期望响应**:
```json
{
  "success": true,
  "message": "Test message sent successfully"
}
```

#### `/api/v1/communication/network-config`
- **方法**: GET/PUT
- **用途**: 获取/更新网络配置
- **当前使用位置**: `Communication.tsx` (配置部分)

### 3. ⚙️ Settings 页面缺失接口

#### `/api/v1/settings`
- **方法**: GET
- **用途**: 获取系统设置
- **期望响应**:
```json
{
  "success": true,
  "data": {
    "general": { "autoStart": true, "minimizeToTray": false },
    "dataPrivacy": { "shareUsageData": false, "shareErrorReports": true }
  }
}
```

#### `/api/v1/settings/general`
- **方法**: PUT
- **用途**: 更新通用设置
- **请求体**:
```json
{
  "autoStart": true,
  "minimizeToTray": false
}
```

#### `/api/v1/settings/data-privacy`
- **方法**: PUT
- **用途**: 更新数据隐私设置
- **请求体**:
```json
{
  "shareUsageData": false,
  "shareErrorReports": true
}
```

#### `/api/v1/settings/restart-backend`
- **方法**: POST
- **用途**: 重启后端服务
- **期望响应**:
```json
{
  "success": true,
  "message": "Backend service restarted successfully"
}
```

#### `/api/v1/settings/reset`
- **方法**: POST
- **用途**: 重置系统设置
- **请求体**:
```json
{
  "resetType": "all" | "settings" | "data"
}
```

### 4. 🌐 Gateway Configuration 页面缺失接口

#### `/api/v1/gateway/status`
- **方法**: GET
- **用途**: 获取网关连接状态
- **期望响应**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "url": "https://gateway.sightai.io",
    "latency": 45,
    "lastPing": "2024-01-01T12:00:00Z"
  }
}
```

#### `/api/v1/gateway/settings`
- **方法**: GET/PUT
- **用途**: 获取/更新网关设置
- **请求体** (PUT):
```json
{
  "gatewayUrl": "https://gateway.sightai.io",
  "apiKey": "your-api-key",
  "timeout": 30000
}
```

### 5. 💰 Earnings 页面缺失接口

#### `/api/v1/earnings/history`
- **方法**: GET
- **用途**: 获取收益历史记录
- **查询参数**: `?page=1&limit=10&period=all`
- **期望响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "date": "2024-01-15",
      "taskType": "Text Generation",
      "model": "llama2-7b",
      "duration": "2m 15s",
      "amount": 0.34,
      "status": "paid"
    }
  ]
}
```

### 6. 🔧 Model Configuration 页面缺失接口

#### `/api/v1/models/install`
- **方法**: POST
- **用途**: 安装新模型
- **请求体**:
```json
{
  "modelName": "llama3.2:3b",
  "source": "ollama" | "huggingface"
}
```

#### `/api/v1/models/uninstall`
- **方法**: DELETE
- **用途**: 卸载模型
- **请求体**:
```json
{
  "modelName": "llama3.2:3b"
}
```

#### `/api/v1/models/status`
- **方法**: GET
- **用途**: 获取模型状态（下载进度等）

## 🔄 已对接的接口

### ✅ 成功对接的接口

#### Dashboard 相关 (完全对接)
1. **系统资源**: `/api/app/system-resources` ✅
2. **应用状态**: `/api/app/status` ✅
3. **Dashboard 统计**: `/api/v1/dashboard/statistics` ✅
4. **任务计数**: `/api/v1/dashboard/task-count` ✅
5. **任务活动**: `/api/v1/dashboard/task-activity` ✅
6. **收益数据**: `/api/v1/dashboard/earnings` ✅

#### 设备管理相关 (完全对接)
7. **设备状态**: `/api/v1/device-status` ✅
8. **网关状态**: `/api/v1/device-status/gateway-status` ✅
9. **DID 信息**: `/api/v1/device-status/did-info` ✅
10. **更新 DID**: `/api/v1/device-status/update-did` ✅

#### 模型和挖矿相关
11. **模型列表**: `/api/v1/models/list` ✅
12. **模型上报**: `/api/v1/models/report` ✅
13. **任务历史**: `/api/v1/miner/history` ✅
14. **挖矿摘要**: `/api/v1/miner/summary` ✅

#### 健康检查
15. **健康检查**: `/api/v1/health` ✅
16. **应用健康**: `/api/app/health` ✅

#### 配置管理 (部分对接)
17. **当前配置**: `/api/v1/config/current` ✅
18. **切换框架**: `/api/v1/config/switch-framework` ✅
19. **应用配置**: `/api/app/config` ✅
20. **框架切换**: `/api/app/switch-framework` ✅

### 📝 对接说明

- **Dashboard 组件**: 已更新使用 `fetchDashboardStatistics()` 方法
- **Earnings 组件**: 已更新使用新的收益 API
- **DeviceStatus 组件**: 新建组件使用设备管理 API
- **API 客户端**: 创建了统一的 `api-client.ts` 工具

## 🚀 下一步行动

### 优先级 1 (高优先级)
1. 实现 `/api/app/system-resources` - Dashboard 核心功能
2. 实现 `/api/app/status` - 应用状态监控
3. 实现 `/api/v1/communication/*` 接口 - Communication 页面功能

### 优先级 2 (中优先级)
1. 实现 `/api/v1/settings/*` 接口 - Settings 页面功能
2. 实现 `/api/v1/gateway/*` 接口 - Gateway 配置功能
3. 实现 `/api/v1/earnings/history` - 收益历史功能

### 优先级 3 (低优先级)
1. 实现 `/api/v1/models/install` 和 `/api/v1/models/uninstall` - 模型管理
2. 完善错误处理和重试机制
3. 添加 API 文档和测试

## 📊 进度统计

- **总需求接口数**: 35 个 (前端页面需要的接口)
- **已存在并对接**: 20 个
- **仍然缺失**: 10 个
- **对接完成率**: 57% (20/35)
- **Dashboard 页面**: 100% 完成 ✅
- **设备管理页面**: 100% 完成 ✅
- **模型管理**: 80% 完成
- **Communication 页面**: 0% 完成 ❌
- **Settings 页面**: 0% 完成 ❌

## 🔧 技术建议

### API 设计原则
1. **统一响应格式**: 所有接口使用相同的响应结构
2. **错误处理**: 提供详细的错误信息和错误码
3. **分页支持**: 列表接口支持分页参数
4. **版本控制**: 使用 `/api/v1/` 前缀进行版本管理

### 实现建议
1. **优先实现核心功能**: 先实现 Dashboard 和 Communication 相关接口
2. **复用现有代码**: 利用现有的服务和控制器
3. **添加测试**: 为新接口添加单元测试和集成测试
4. **更新文档**: 及时更新 OpenAPI 文档

---

📝 **注意**: 此文档会随着接口实现进度持续更新。请在实现接口后及时更新此文档的状态。
