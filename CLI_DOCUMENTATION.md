# SightAI Miner CLI 文档

## 概述

SightAI Miner CLI 是一个命令行工具，用于管理和操作 SightAI 挖矿节点。它支持设备注册、模型管理、状态监控等功能，并提供了灵活的部署选项。

## 安装和环境要求

### 系统要求
- **Ollama**: 必须在系统上安装并运行 Ollama 服务（端口 11434）
- **Docker**: 如果使用 Docker 部署
- **Node.js**: 如果直接运行 CLI（非 Docker 环境）

### 前置条件
1. 确保 Ollama 服务正在运行：
   ```bash
   # 检查 Ollama 状态
   curl http://localhost:11434/api/version
   ```

2. 准备网关注册信息：
   - Gateway URL
   - Node Code
   - Gateway API Key
   - Reward Address
   - API Base Path

## 命令参考

### 全局选项
```bash
sight-cli --help          # 显示帮助信息
sight-cli --version       # 显示版本信息
```

### 1. run - 运行挖矿服务

启动 SightAI 挖矿服务，支持本地和远程模式。

#### 语法
```bash
sight-cli run [options]
```

#### 选项
- `-m, --mode <mode>`: 运行模式（local 或 remote）
- `-g, --gateway-url <url>`: 网关 API URL（远程模式必需）
- `-n, --node-code <code>`: 节点代码（远程模式必需）
- `-k, --gateway-api-key <key>`: 网关 API 密钥（远程模式必需）
- `-r, --reward-address <address>`: 奖励地址（远程模式必需）
- `-a, --api-base-path <path>`: API 服务器基础路径（远程模式必需）

#### 示例
```bash
# 交互式模式选择
sight-cli run

# 本地模式
sight-cli run --mode local

# 远程模式
sight-cli run --mode remote \
  --gateway-url "https://gateway.sightai.io" \
  --node-code "YOUR_NODE_CODE" \
  --gateway-api-key "YOUR_API_KEY" \
  --reward-address "YOUR_REWARD_ADDRESS" \
  --api-base-path "/"
```

### 2. register - 设备注册

向网关注册设备，不启动挖矿服务。

#### 语法
```bash
sight-cli register [options]
```

#### 选项
- `-g, --gateway-url <url>`: 网关 API URL
- `-n, --node-code <code>`: 节点代码
- `-k, --gateway-api-key <key>`: 网关 API 密钥
- `-r, --reward-address <address>`: 奖励地址
- `-a, --api-base-path <path>`: API 服务器基础路径
- `-i, --interactive`: 使用交互模式输入参数

#### 示例
```bash
# 交互式注册
sight-cli register --interactive

# 直接注册
sight-cli register \
  --gateway-url "https://gateway.sightai.io" \
  --node-code "ABC123" \
  --gateway-api-key "your-api-key" \
  --reward-address "your-address" \
  --api-base-path "/"
```

### 3. status - 检查状态

检查挖矿服务的运行状态。

#### 语法
```bash
sight-cli status
```

#### 示例
```bash
sight-cli status
```

#### 输出示例
```
✅ Miner service is running on port 8716
```

### 4. report-models - 报告模型

选择并报告本地可用的模型到网关。

#### 语法
```bash
sight-cli report-models [options]
```

#### 选项
- `-a, --all`: 报告所有可用模型，不显示选择提示

#### 示例
```bash
# 交互式选择模型
sight-cli report-models

# 报告所有模型
sight-cli report-models --all
```

### 5. re-register - 重新注册

使用之前保存的注册参数重新注册设备。

#### 语法
```bash
sight-cli re-register
```

#### 示例
```bash
sight-cli re-register
```