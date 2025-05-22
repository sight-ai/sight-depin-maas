# Sight AI CLI 快速参考

## 基本命令

| 命令 | 别名 | 描述 | 示例 |
|------|------|------|------|
| `sight-cli` | - | 进入交互式主菜单 | `sight-cli` |
| `sight-cli register` | `reg` | 网关注册管理 | `sight-cli register` |
| `sight-cli model` | `mod` | 模型管理 | `sight-cli model` |
| `sight-cli status` | `stat` | 状态监控 | `sight-cli status` |
| `sight-cli logs` | `log` | 日志管理 | `sight-cli logs` |

## 日志命令（命令式）

| 命令 | 描述 | 示例 |
|------|------|------|
| `logs view <type>` | 查看指定类型日志 | `sight-cli logs view backend -n 100` |
| `logs search <type> <query>` | 搜索日志内容 | `sight-cli logs search cli "error"` |
| `logs stats [type]` | 显示日志统计 | `sight-cli logs stats backend` |
| `logs clean` | 清理旧日志 | `sight-cli logs clean` |

### 日志类型
- `cli` - CLI 操作日志
- `backend` - 后端服务日志  
- `system` - 系统日志

## 功能模块快速导航

### 🔗 网关注册 (`register`)
```
📝 新设备注册
🔄 重新注册（使用现有信息）
✏️ 修改注册信息
🗑️ 清除注册信息
📊 查看注册状态
```

### 🤖 模型管理 (`model`)
```
📋 查看本地模型
▶️ 启动模型（上报）
⏹️ 查看运行中的模型
⬇️ 拉取新模型
🗑️ 删除模型
📤 报告模型到网关
```

### 📊 状态监控 (`status`)
```
📈 查看当前状态
🔄 实时监控
🖥️ 系统信息
🔧 服务状态
⛏️ 矿工状态
```

### 📋 日志管理 (`logs`)
```
📖 查看日志
🔍 搜索日志
📊 日志统计
🧹 清理日志
📡 实时监控
```

## 常用模型

| 模型名称 | 大小 | 用途 | 推荐配置 |
|----------|------|------|----------|
| `llama2:7b` | ~3.8GB | 通用对话 | 8GB+ RAM |
| `llama2:13b` | ~7.3GB | 高质量对话 | 16GB+ RAM |
| `codellama:7b` | ~3.8GB | 代码生成 | 8GB+ RAM |
| `mistral:7b` | ~4.1GB | 高效能模型 | 8GB+ RAM |
| `deepseek-coder:6.7b` | ~3.7GB | 代码专用 | 8GB+ RAM |

## 状态指示器

### 服务状态
- ✅ **运行中** - 服务正常运行
- ❌ **已停止** - 服务未运行
- ⚠️ **警告** - 服务异常或连接问题

### 资源使用率颜色
- 🟢 **绿色** (0-70%) - 正常
- 🟡 **黄色** (70-90%) - 警告
- 🔴 **红色** (90%+) - 危险

## 快速故障排除

### 后端服务未运行
```bash
# 检查服务状态
sight-cli status
# 选择 "服务状态"

# 解决方案：
# 1. 启动 SightAI 应用
# 2. 检查端口 8716 是否被占用
# 3. 重启应用
```

### Ollama 服务未运行
```bash
# 安装 Ollama
# 访问: https://ollama.ai/download

# 启动服务
ollama serve

# 验证
sight-cli status
```

### 网关连接断开
```bash
# 重新注册
sight-cli register
# 选择 "重新注册"

# 或检查网络连接
ping gateway-url
```

### 模型启动失败
```bash
# 检查 Ollama 服务
sight-cli status

# 查看错误日志
sight-cli logs search backend "error" -n 50

# 重新拉取模型
sight-cli model
# 选择 "拉取新模型"
```

## 配置文件位置

```
~/.sightai/
├── config.json      # 注册信息和配置
├── logs/
│   ├── cli.log      # CLI 操作日志
│   ├── backend.log  # 后端服务日志
│   └── system.log   # 系统日志
```

## 端口信息

| 服务 | 默认端口 | 描述 |
|------|----------|------|
| SightAI 后端 | 8716 | API 服务器 |
| Ollama | 11434 | AI 模型服务 |

## 键盘快捷键

### 交互式菜单
- `↑/↓` - 上下选择
- `Enter` - 确认选择
- `Ctrl+C` - 退出/取消

### 实时监控
- `Ctrl+C` - 停止监控
- `任意键` - 开始监控

## 日志级别

| 级别 | 图标 | 描述 |
|------|------|------|
| INFO | ℹ️ | 一般信息 |
| WARN | ⚠️ | 警告信息 |
| ERROR | ❌ | 错误信息 |
| SUCCESS | ✅ | 成功信息 |

## 常用命令组合

### 完整健康检查
```bash
sight-cli status          # 查看整体状态
sight-cli logs stats      # 查看日志统计
sight-cli logs search backend "error" -n 50  # 检查错误
```

### 模型部署流程
```bash
sight-cli model           # 进入模型管理
# 1. 拉取新模型
# 2. 启动模型
# 3. 报告到网关
```

### 日常维护
```bash
sight-cli logs clean      # 清理日志
sight-cli status          # 检查状态
sight-cli logs stats      # 查看统计
```

## 版本信息

- **当前版本**: 1.0.0
- **Node.js**: 20.x
- **构建**: TypeScript
- **许可证**: MIT

## 获取帮助

```bash
sight-cli --help          # 显示帮助
sight-cli --version       # 显示版本
sight-cli <command> --help # 命令帮助
```

## 支持的操作系统

- ✅ Linux
- ✅ macOS  
- ✅ Windows (WSL)
- ✅ Windows (原生)
