# Sight AI CLI包装器

现代化的Sight AI命令行工具，支持设备管理、模型管理和后台服务器运行。

## 🚀 功能特性

- **设备管理**: 注册、状态查看、取消注册
- **模型管理**: 列表展示、交互式上报、状态查看
- **服务器管理**: 前台/后台启动、停止、状态检查
- **进程管理**: PID文件管理、优雅停止、状态监控
- **灵活配置**: 支持命令行参数、环境变量、交互式输入
- **交互式CLI**: 菜单驱动的操作界面
- **轻量级架构**: 无需完整NestJS应用启动
- **跨平台支持**: Windows、Linux、macOS

## 📦 安装和构建

### 开发环境

```bash
# 构建项目
npx nx build cli-wrapper

# 运行开发版本
node dist/packages/apps/cli-wrapper/main.js
```

## 🎯 使用方法

### 基本命令

```bash
# 查看帮助
sight

# 后台启动服务器（推荐）
sight start --daemon

# 前台启动服务器
sight start

# 停止后台服务器
sight stop

# 检查服务器状态
sight server-status
```

### 设备管理

#### 设备注册

支持三种注册方式：

**1. 命令行参数模式（推荐）**
```bash
# 完整参数注册
sight register \
  --code "REGISTRATION_CODE" \
  --gateway "http://localhost:8718" \
  --reward "REWARD_ADDRESS" \
  --key "JWT_TOKEN" \
  --base-path "/api/v1"

# 简化参数（其他参数会交互式询问）
sight register --code "REGISTRATION_CODE"
```

**2. 环境变量模式**
```bash
# 设置环境变量
export API_SERVER_BASE_PATH="/api/v1"

# 注册（其他参数通过命令行或交互式输入）
sight register --code "..." --gateway "..." --reward "..." --key "..."
```

**3. 交互式模式**
```bash
# 完全交互式注册
sight register
# 会依次询问：Registration Code、Gateway Address、Reward Address、Authentication Key、API Server Base Path
```

#### 其他设备命令

```bash
# 查看设备状态
sight status

# 取消注册
sight unregister
```

### 模型管理

```bash
# 列出本地模型
sight models list

# 交互式上报模型
sight models report

# 上报所有模型
sight models report-all

# 查看上报状态
sight models status
```

## 🔧 进程管理

### 后台服务器管理

CLI工具提供完整的后台进程管理功能：

```bash
# 启动后台服务器
sight start --daemon

# 停止后台服务器
sight stop

# 检查服务器状态
sight server-status

# 前台启动（用于调试）
sight start
```

### 进程管理特性

- **PID文件管理**: 自动管理进程ID文件（`~/.sightai/sightai.pid`）
- **锁文件机制**: 防止重复启动（`~/.sightai/sightai.lock`）
- **优雅停止**: 先发送SIGTERM，3秒后强制SIGKILL
- **状态检查**: 实时检查进程是否运行
- **自动清理**: 进程停止后自动清理PID文件

### pkg打包环境

当使用pkg打包为可执行文件后，所有功能完全兼容：

```bash
# Windows
sightai.exe start --daemon
sightai.exe stop
sightai.exe server-status
sightai.exe register --code "..." --gateway "..." --reward "..." --key "..."

# Linux/macOS
./sightai start --daemon
./sightai stop
./sightai server-status
./sightai register --code "..." --gateway "..." --reward "..." --key "..."
```

## ⚙️ 配置选项

### API_SERVER_BASE_PATH 配置

WebSocket连接的API服务器基础路径，支持多种配置方式：

**优先级**: 命令行参数 > 环境变量 > 默认值（空字符串）

```bash
# 方式1: 环境变量
export API_SERVER_BASE_PATH="/api/v1"
sight register --code "..." --gateway "..." --reward "..." --key "..."

# 方式2: 命令行参数（会覆盖环境变量）
sight register --code "..." --gateway "..." --reward "..." --key "..." --base-path "/api/v1"

# 方式3: 交互式输入
sight register
# 会询问: API Server Base Path (optional): [当前环境变量值]
```

### 命令行选项

所有命令都支持 `--help` 查看详细选项：

```bash
# 查看register命令的所有选项
sight register --help

# 输出:
# Options:
#   -c, --code <code>        Registration code
#   -g, --gateway <address>  Gateway address (default: "https://gateway.saito.ai")
#   -r, --reward <address>   Reward address
#   -k, --key <key>          Authentication key
#   -b, --base-path <path>   API server base path for WebSocket connection
#   -h, --help               display help for command
```

## 🏗️ 技术架构

### 轻量级设计

- **无依赖启动**: CLI工具不需要启动完整的NestJS应用
- **HTTP API调用**: 通过HTTP请求与后端服务通信
- **本地存储**: 使用RegistrationStorage管理本地配置
- **进程分离**: CLI和后端服务完全独立运行

### 技术实现

- **智能环境检测**: 自动检测是否在pkg环境中运行
- **双模式支持**:
  - 开发环境：使用Node.js + 脚本文件
  - pkg环境：使用可执行文件 + 内部命令
- **进程管理**: 使用PID文件管理后台进程
- **状态检查**: 实时检查服务器运行状态
- **跨平台兼容**: Windows、Linux、macOS全平台支持

## 📁 文件结构

```
packages/apps/cli-wrapper/
├── src/
│   ├── main.ts              # 主入口文件，命令行解析
│   ├── commands/            # 命令模块
│   │   ├── device.ts        # 设备管理命令（注册、状态、取消注册）
│   │   └── models.ts        # 模型管理命令（列表、上报、状态）
│   ├── services/            # 服务访问层
│   │   ├── app-services.ts  # 轻量级服务访问（HTTP API调用）
│   │   └── process-manager.ts # 进程管理服务（PID、启动、停止）
│   └── utils/               # 工具类
│       ├── ui.ts            # 界面工具（spinner、消息、颜色）
│       └── table.ts         # 表格展示工具
├── dist/                    # 构建输出
├── build-pkg.js            # pkg打包脚本
├── pkg.config.json         # pkg配置文件
├── README.md               # 项目文档
└── package.json            # 项目配置
```

## 🚨 故障排除

### 常见问题

**1. 注册失败：connect ECONNREFUSED**
```bash
# 确保后端服务正在运行
sight start --daemon
sight server-status

# 检查端口是否被占用
netstat -tulpn | grep 8716
```

**2. 后台服务无法停止**
```bash
# 检查进程状态
sight server-status

# 手动清理（如果需要）
rm ~/.sightai/sightai.pid
rm ~/.sightai/sightai.lock
```

**3. 权限问题（Linux/macOS）**
```bash
# 确保可执行权限
chmod +x ./sightai

# 检查用户目录权限
ls -la ~/.sightai/
```

### 调试模式

```bash
# 前台启动查看详细日志
sight start

# 检查配置文件
ls -la ~/.sightai/config/
cat ~/.sightai/config/device-registration.json
```

## 📝 更新日志

### v2.0.0 (最新)
- ✅ 添加完整的进程管理功能（start/stop/status）
- ✅ 支持API_SERVER_BASE_PATH多种配置方式
- ✅ 轻量级架构重构，无需完整NestJS启动
- ✅ 修复unregister命令卡住问题
- ✅ 改进错误处理和用户体验
- ✅ 支持命令行参数、环境变量、交互式输入三种模式

### v1.0.0
- ✅ 基础设备管理功能
- ✅ 模型管理功能
- ✅ 交互式CLI界面
- ✅ pkg打包支持