# Sight AI CLI包装器

现代化的Sight AI命令行工具，支持设备管理、模型管理和后台服务器运行。

## 🚀 功能特性

- **设备管理**: 注册、状态查看、取消注册
- **模型管理**: 列表展示、交互式上报、状态查看
- **服务器管理**: 前台/后台启动、停止、状态检查
- **交互式CLI**: 菜单驱动的操作界面
- **跨平台支持**: Windows、Linux、macOS

## 📦 安装和构建

### 开发环境

```bash
# 构建项目
npx nx build cli-wrapper

# 运行开发版本
node dist/packages/apps/cli-wrapper/main.js
```

### 打包为可执行文件

```bash
# 安装pkg（如果未安装）
npm install -g pkg

# 构建所有平台的可执行文件
cd packages/apps/cli-wrapper
npm run pkg:build

# 或者构建特定平台
npm run pkg:win     # Windows
npm run pkg:linux   # Linux
npm run pkg:macos   # macOS
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

```bash
# 查看设备状态
sight status

# 注册设备
sight register

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

### 交互式模式

```bash
# 进入交互式CLI
sight cli
```

## 🔧 后台运行支持

### pkg打包环境

当使用pkg打包为可执行文件后，后台运行功能会自动适配：

```bash
# Windows
a.exe start --daemon
a.exe stop
a.exe status
a.exe models list

# Linux
./a start --daemon
./a stop
./a status
./a models list

# macOS
./a start --daemon
./a stop
./a status
./a models list
```

### 技术实现

- **智能环境检测**: 自动检测是否在pkg环境中运行
- **双模式支持**:
  - 开发环境：使用Node.js + 脚本文件
  - pkg环境：使用可执行文件 + 内部命令
- **进程管理**: 使用PID文件管理后台进程
- **状态检查**: 实时检查服务器运行状态
- **跨平台兼容**: Windows、Linux、macOS全平台支持

### pkg环境特殊处理

在pkg打包环境中，CLI工具会：
1. 检测到`process.pkg`存在
2. 使用`start-server`内部命令启动后端
3. 自动包含所有NestJS依赖和api-server代码
4. 支持完整的后台运行和进程管理

## 📁 文件结构

```
packages/apps/cli-wrapper/
├── src/
│   ├── main.ts              # 主入口文件
│   ├── commands/            # 命令模块
│   │   ├── device.ts        # 设备管理命令
│   │   └── models.ts        # 模型管理命令
│   ├── services/            # 服务访问层
│   │   └── app-services.ts  # 统一服务访问
│   └── utils/               # 工具类
│       ├── ui.ts            # 界面工具
│       └── table.ts         # 表格展示
├── dist/                    # 构建输出
├── build-pkg.js            # pkg打包脚本
├── pkg.config.json         # pkg配置文件
└── package.json            # 项目配置
```

## 🛠️ 开发指南

### 添加新命令

1. 在`src/commands/`目录创建新的命令模块
2. 在`main.ts`中注册新命令
3. 使用统一的UI工具类和错误处理

### 集成新服务

1. 在`src/services/app-services.ts`中添加服务访问方法
2. 实现服务健康检查逻辑
3. 添加相应的错误处理

## 🔍 故障排除

### 常见问题

1. **服务器启动失败**
   - 检查端口是否被占用
   - 确认后端依赖是否正确安装

2. **后台进程无法启动**
   - 检查PID文件权限
   - 确认可执行文件路径正确

3. **模型列表为空**
   - 确认Ollama服务是否运行
   - 检查模型是否正确安装

### 调试模式

```bash
# 查看详细启动信息
sight start --daemon

# 检查服务器状态
sight server-status

# 查看PID文件
cat ~/.sightai/server.pid
```

## 📝 更新日志

### v1.0.0
- ✅ 模块化架构重构
- ✅ 专业第三方库集成
- ✅ 后台运行支持
- ✅ pkg打包支持
- ✅ 跨平台兼容性
- ✅ 交互式CLI模式
- ✅ 美观的表格展示
- ✅ 完善的错误处理
