# Sight AI 交互式 CLI 工具

一个功能强大的交互式命令行工具，用于管理 Sight AI 矿工的网关注册、模型管理和运行状态监控。

## 📚 文档导航

- **[完整文档](./CLI_DOCUMENTATION.md)** - 详细的功能说明和使用指南
- **[使用示例](./USAGE_EXAMPLES.md)** - 实际使用场景和最佳实践
- **[快速参考](./QUICK_REFERENCE.md)** - 命令速查表和故障排除

## 功能特性

### 🔗 网关注册管理
- 交互式设备注册到网关
- 保存和重用注册信息
- 注册状态检查和管理
- 清除注册信息

### 🤖 模型上报管理
- 查看本地模型列表
- 启动模型（模型上报）
- 查看运行中的模型状态
- 拉取新模型
- 删除不需要的模型
- 报告模型到网关

### 📊 运行状态监控
- 实时系统状态监控
- 详细的系统信息查看
- 服务状态检查
- 矿工状态监控
- 资源使用情况分析

## 安装和构建

### 前提条件
- Node.js 18+
- 已安装并配置好的 Sight AI 后端服务
- Ollama AI 服务（用于模型管理）

### 构建项目
```bash
# 在 backend 目录下
cd backend

# 安装依赖
npm install

# 构建 CLI 工具
nx build cli-tool

# 或者使用开发模式
nx serve cli-tool
```

### 全局安装
```bash
# 构建后，可以全局安装
npm link dist/packages/apps/cli-tool

# 现在可以在任何地方使用
sight-cli --help
```

## 快速开始

### 基本命令

```bash
# 显示帮助信息
sight-cli --help

# 交互式主菜单
sight-cli

# 网关注册管理
sight-cli register
sight-cli reg  # 简写

# 模型管理
sight-cli model
sight-cli mod  # 简写

# 状态监控
sight-cli status
sight-cli stat  # 简写

# 日志管理
sight-cli logs
sight-cli log  # 简写
```

### 两种使用方式

1. **交互式终端模式**：直接运行 `sight-cli` 进入主菜单
2. **命令式交互模式**：使用特定命令进入对应功能界面

详细使用方法请参考 [完整文档](./CLI_DOCUMENTATION.md)。

### 典型使用流程

1. **设备注册**
   ```bash
   sight-cli register
   ```

2. **模型管理**
   ```bash
   sight-cli model
   ```

3. **状态监控**
   ```bash
   sight-cli status
   ```

4. **日志查看**
   ```bash
   sight-cli logs
   ```

更多详细使用流程和示例请参考 [使用示例文档](./USAGE_EXAMPLES.md)。

## 配置文件

CLI 工具会在用户主目录下创建配置和日志文件：
```
~/.sightai/
├── config.json      # 注册信息和配置
├── logs/
│   ├── cli.log      # CLI 操作日志
│   ├── backend.log  # 后端服务日志
│   └── system.log   # 系统日志
```

## 故障排除

常见问题的解决方案请参考：
- [快速参考 - 故障排除](./QUICK_REFERENCE.md#快速故障排除)
- [使用示例 - 最佳实践](./USAGE_EXAMPLES.md#最佳实践)

### 状态指示器

- ✅ 成功操作（绿色）
- ⚠️ 警告信息（黄色）
- ❌ 错误信息（红色）
- ℹ️ 信息提示（蓝色）

## 开发

### 项目结构
```
src/
├── main.ts                 # 主入口文件
├── commands/               # 命令实现
│   ├── register.command.ts # 注册命令
│   ├── model.command.ts    # 模型命令
│   └── status.command.ts   # 状态命令
├── services/               # 业务逻辑服务
│   ├── gateway.service.ts  # 网关服务
│   ├── model.service.ts    # 模型服务
│   └── status.service.ts   # 状态服务
└── utils/                  # 工具类
    ├── cli-ui.ts          # CLI 界面工具
    └── config.ts          # 配置管理
```

### 添加新功能

1. 在 `services/` 中添加业务逻辑
2. 在 `commands/` 中添加命令处理
3. 在 `main.ts` 中注册新命令
4. 更新 README 文档

## 许可证

MIT License
