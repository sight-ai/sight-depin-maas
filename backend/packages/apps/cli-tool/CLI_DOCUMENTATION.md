# Sight AI CLI 工具文档

## 概述

Sight AI CLI 是一个功能强大的交互式命令行工具，用于管理 Sight AI 矿工节点。它提供了网关注册、模型管理、状态监控和日志查看等核心功能。

## 安装和使用

### 构建和安装
```bash
# 构建 CLI 工具
cd backend/packages/apps/cli-tool
npm run build

# 全局安装（可选）
npm link

# 或直接运行
node dist/main.js
```

### 基本语法
```bash
sight-cli [command] [options]
```

## 使用方式

### 1. 交互式终端模式

直接运行 `sight-cli` 不带任何参数，将进入交互式菜单模式：

```bash
sight-cli
```

这将显示欢迎横幅和主菜单，您可以通过方向键和回车键进行导航。

### 2. 命令式交互模式

使用特定命令直接进入对应功能的交互界面：

```bash
sight-cli register    # 网关注册管理
sight-cli model      # 模型管理
sight-cli status     # 状态监控
sight-cli logs       # 日志管理
```

## 主要功能模块

### 🔗 网关注册管理 (`register` / `reg`)

#### 交互式使用
```bash
sight-cli register
```

**功能包括：**
- 新设备注册
- 重新注册（使用现有信息）
- 修改注册信息
- 清除注册信息
- 查看注册状态

**注册信息包含：**
- 网关 URL
- 节点代码
- 网关 API 密钥
- 奖励地址
- API 服务器基础路径（默认：http://localhost:8716）

#### 使用流程
1. 首次运行会提示输入注册信息
2. 系统会验证输入格式（URL、必填字段等）
3. 确认信息后执行注册
4. 注册成功后信息会保存到本地配置

### 🤖 模型管理 (`model` / `mod`)

#### 交互式使用
```bash
sight-cli model
```

**功能包括：**
- 📋 查看本地模型列表
- ▶️ 启动模型（上报到网关）
- ⏹️ 查看运行中的模型
- ⬇️ 拉取新模型
- 🗑️ 删除模型
- 📤 报告模型到网关

#### 常用模型推荐
- `llama2:7b` - 轻量级通用模型
- `llama2:13b` - 中等规模通用模型
- `codellama:7b` - 代码生成模型
- `mistral:7b` - 高效能模型
- `deepseek-coder:6.7b` - 代码专用模型

#### 使用示例
1. 拉取模型：选择"拉取新模型" → 输入模型名称 → 确认下载
2. 启动模型：选择"启动模型" → 从列表选择模型 → 自动上报到网关
3. 查看状态：选择"查看运行中的模型" → 显示内存使用等信息

### 📊 状态监控 (`status` / `stat`)

#### 交互式使用
```bash
sight-cli status
```

**功能包括：**
- 📈 查看当前状态
- 🔄 实时监控
- 🖥️ 系统信息
- 🔧 服务状态
- ⛏️ 矿工状态

#### 监控内容

**系统资源：**
- CPU 使用率、型号、核心数、温度
- 内存使用率、总量、可用量
- 磁盘使用率、总容量、可用空间
- GPU 信息（型号、显存、温度、使用率）
- 网络接口流量统计

**服务状态：**
- SightAI 后端服务（端口 8716）
- Ollama AI 服务（端口 11434）
- 网关连接状态

**矿工状态：**
- 设备连接状态
- 设备 ID
- 完成任务数
- 累计收益
- 运行时长
- 最后心跳时间

#### 实时监控
选择"实时监控"可以设置更新间隔（1-60秒），持续显示系统状态。按 Ctrl+C 停止监控。

### 📋 日志管理 (`logs` / `log`)

#### 交互式使用
```bash
sight-cli logs
```

**功能包括：**
- 查看不同类型日志（CLI、后端、系统）
- 实时日志监控
- 日志搜索
- 日志统计
- 清理旧日志

#### 命令式使用

**查看日志：**
```bash
sight-cli logs view <type> [-n lines]
```
示例：
```bash
sight-cli logs view cli -n 100      # 查看最近100条CLI日志
sight-cli logs view backend -n 50   # 查看最近50条后端日志
sight-cli logs view system          # 查看系统日志（默认50条）
```

**搜索日志：**
```bash
sight-cli logs search <type> <query> [-n lines]
```
示例：
```bash
sight-cli logs search backend "error" -n 200    # 在最近200条后端日志中搜索"error"
sight-cli logs search cli "register"            # 在CLI日志中搜索"register"
```

**日志统计：**
```bash
sight-cli logs stats [type]
```
示例：
```bash
sight-cli logs stats           # 显示所有类型日志统计
sight-cli logs stats backend   # 显示后端日志统计
```

**清理日志：**
```bash
sight-cli logs clean
```

#### 日志类型说明
- **CLI 日志** (`cli`)：记录用户的CLI操作和命令执行
- **后端日志** (`backend`)：记录后端服务的运行状态和错误
- **系统日志** (`system`)：记录系统级别的事件和错误

## 帮助和版本信息

```bash
sight-cli --help     # 显示帮助信息
sight-cli --version  # 显示版本信息
```

## 配置文件

CLI 工具的配置和日志文件存储在用户主目录的 `.sightai` 文件夹中：

```
~/.sightai/
├── config.json      # 配置文件（注册信息等）
├── logs/
│   ├── cli.log      # CLI 操作日志
│   ├── backend.log  # 后端服务日志
│   └── system.log   # 系统日志
```

## 故障排除

### 常见问题

**1. 后端服务未运行**
- 检查 SightAI 应用是否已启动
- 确认端口 8716 未被占用
- 重启 SightAI 应用

**2. Ollama 服务未运行**
- 安装 Ollama：https://ollama.ai/download
- 启动 Ollama 服务
- 确认端口 11434 未被占用

**3. 网关连接断开**
- 检查网络连接
- 使用 `sight-cli register` 重新注册
- 确认网关服务器可访问

**4. 模型相关问题**
- 确保 Ollama 服务正常运行
- 检查磁盘空间是否足够
- 验证模型名称是否正确

### 日志调试

使用日志功能可以帮助诊断问题：

```bash
# 查看最近的错误日志
sight-cli logs search backend "error" -n 100
sight-cli logs search system "error" -n 100

# 查看特定操作的日志
sight-cli logs search cli "register"
sight-cli logs search cli "model"
```

## 开发信息

- **版本**: 1.0.0
- **Node.js**: 20.x
- **主要依赖**: Commander.js, Inquirer, Chalk, Ora, Systeminformation
- **构建工具**: TypeScript, ts-node

## 许可证

MIT License
