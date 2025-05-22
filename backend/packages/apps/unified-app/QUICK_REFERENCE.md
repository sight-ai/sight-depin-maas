# Sight AI 统一应用快速参考

## 基本命令

| 命令 | 描述 | 示例 |
|------|------|------|
| `sight-ai` | 启动交互式管理界面（默认） | `sight-ai` |
| `sight-ai interactive` | 启动交互式管理界面 | `sight-ai interactive` |
| `sight-ai backend` | 直接启动后台服务 | `sight-ai backend` |
| `sight-ai cli [command]` | 直接运行 CLI 命令 | `sight-ai cli register` |

## 主菜单功能

| 功能 | 图标 | 描述 | 前置条件 |
|------|------|------|----------|
| 启动/停止后台服务 | 🚀/🛑 | 管理后台服务生命周期 | 无 |
| 网关注册管理 | 🔗 | 设备注册到网关 | 后台服务运行 |
| 模型上报管理 | 🤖 | 管理 AI 模型 | 后台服务运行 |
| 运行状态监控 | 📊 | 查看系统状态 | 后台服务运行 |
| CLI 交互模式 | 🎛️ | 完整 CLI 功能 | 后台服务运行 |
| 检查服务状态 | 🔧 | 详细状态报告 | 无 |
| 应用设置 | ⚙️ | 配置管理 | 无 |
| 性能监控 | 📈 | 系统性能分析 | 无 |
| 查看日志 | 📋 | 日志管理 | 无 |
| 退出 | 🚪 | 退出应用 | 无 |

## 配置选项

### 主题设置
| 主题 | 描述 | 特点 |
|------|------|------|
| `default` | 默认主题 | 蓝色系，清晰层次 |
| `minimal` | 简约主题 | 黑白配色，极简设计 |
| `colorful` | 彩色主题 | 多彩配色，丰富视觉 |

### 应用设置
| 设置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `theme` | string | `default` | 界面主题 |
| `autoStartBackend` | boolean | `false` | 自动启动后台 |
| `showDetailedLogs` | boolean | `false` | 显示详细日志 |
| `checkUpdates` | boolean | `true` | 检查更新 |
| `language` | string | `zh-CN` | 界面语言 |

### 默认快捷键
| 快捷键 | 功能 | 描述 |
|--------|------|------|
| `q` | exit | 退出应用 |
| `s` | status | 状态监控 |
| `r` | register | 网关注册 |
| `m` | model | 模型管理 |
| `b` | backend | 后台服务 |

## 性能监控指标

### 系统资源
| 指标 | 描述 | 正常范围 |
|------|------|----------|
| 内存使用率 | 系统内存占用百分比 | < 80% |
| CPU 使用率 | 处理器使用百分比 | < 70% |
| 运行时间 | 应用运行时长 | - |
| 响应时间 | API 响应延迟 | < 1000ms |

### 健康评分
| 分数范围 | 状态 | 图标 | 描述 |
|----------|------|------|------|
| 90-100 | Excellent | 💚 | 系统运行优秀 |
| 70-89 | Good | 💛 | 系统运行良好 |
| 50-69 | Fair | 🧡 | 系统运行一般 |
| 0-49 | Poor | ❤️ | 系统需要关注 |

### 评分权重
| 因素 | 权重 | 影响 |
|------|------|------|
| 内存使用率 | 30% | >90% 扣30分，>80% 扣20分，>70% 扣10分 |
| CPU 使用率 | 30% | >90% 扣30分，>80% 扣20分，>70% 扣10分 |
| 服务状态 | 40% | 停止扣40分，未知扣20分 |
| 响应时间 | 额外 | >5s 扣10分，>3s 扣5分 |

## 状态指示器

### 服务状态
| 图标 | 状态 | 描述 |
|------|------|------|
| 🟢 | 运行中 | 服务正常运行 |
| 🔴 | 已停止 | 服务未运行 |
| ⚠️ | 警告 | 服务异常 |
| ⚪ | 未知 | 状态不明 |

### 操作结果
| 图标 | 含义 | 使用场景 |
|------|------|----------|
| ✅ | 成功 | 操作成功完成 |
| ❌ | 失败 | 操作失败 |
| ⚠️ | 警告 | 需要注意的情况 |
| ℹ️ | 信息 | 一般信息提示 |

## 文件和目录

### 配置文件
```
~/.sightai/
├── unified-app-config.json    # 统一应用配置
├── config.json               # CLI 工具配置
└── logs/
    └── system-YYYY-MM-DD.log # 系统日志
```

### 项目结构
```
backend/packages/apps/unified-app/
├── src/
│   ├── main.ts              # 主入口
│   └── utils/
│       ├── config.ts        # 配置管理
│       ├── theme.ts         # 主题系统
│       └── performance.ts   # 性能监控
├── dist/                    # 编译输出
├── package.json            # 项目配置
└── tsconfig.app.json       # TypeScript 配置
```

## 端口和服务

| 服务 | 端口 | 协议 | 描述 |
|------|------|------|------|
| 后台 API | 8716 | HTTP | 主要 API 服务 |
| Ollama | 11434 | HTTP | AI 模型服务 |
| 健康检查 | 8716 | HTTP | `/api/v1/health` |

## 快速故障排除

### 后台服务问题
```bash
# 检查端口占用
netstat -an | grep 8716

# 检查项目根目录
ls -la nx.json

# 手动启动测试
npx nx serve api-server

# 查看详细日志
sight-ai backend
```

### CLI 工具问题
```bash
# 检查 CLI 编译状态
ls -la packages/apps/cli-tool/dist/main.js

# 重新编译 CLI
cd packages/apps/cli-tool && npm run build

# 测试 CLI 功能
sight-ai cli --help
```

### 配置问题
```bash
# 重置配置
rm ~/.sightai/unified-app-config.json

# 查看配置文件
cat ~/.sightai/unified-app-config.json

# 手动编辑配置
nano ~/.sightai/unified-app-config.json
```

### 性能问题
```bash
# 检查系统资源
top
htop
free -h
df -h

# 查看进程状态
ps aux | grep sight

# 监控日志
tail -f ~/.sightai/logs/system-$(date +%Y-%m-%d).log
```

## 常用操作流程

### 首次使用
```
1. sight-ai
2. 🚀 启动后台服务
3. 🔧 检查服务状态
4. 🔗 网关注册管理
5. 🤖 模型上报管理
```

### 日常检查
```
1. sight-ai
2. 📈 性能监控
3. 📋 查看日志
4. 🔧 检查服务状态
```

### 故障排除
```
1. 🔧 检查服务状态
2. 📋 查看日志 → 搜索错误
3. 🛑 停止后台服务
4. 🚀 启动后台服务
5. 重复步骤1-2验证
```

### 配置管理
```
1. ⚙️ 应用设置
2. 选择要修改的设置项
3. 确认更改
4. 重启应用生效（如需要）
```

## 键盘操作

### 交互式菜单
| 按键 | 功能 |
|------|------|
| `↑/↓` | 上下选择 |
| `Enter` | 确认选择 |
| `Ctrl+C` | 退出/取消 |
| `Space` | 选择/取消选择（多选） |

### 快捷键
| 按键 | 功能 | 上下文 |
|------|------|--------|
| `q` | 退出 | 主菜单 |
| `s` | 状态监控 | 主菜单 |
| `r` | 网关注册 | 主菜单 |
| `m` | 模型管理 | 主菜单 |
| `b` | 后台服务 | 主菜单 |

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `SIGHT_CONFIG_DIR` | 配置目录 | `~/.sightai` |
| `SIGHT_LOG_LEVEL` | 日志级别 | `info` |

## 开发调试

### 开发模式
```bash
# 启动开发模式
npm run dev

# 监控文件变化
npm run dev -- --watch

# 调试模式
NODE_ENV=development npm run dev
```

### 日志调试
```bash
# 实时查看日志
tail -f ~/.sightai/logs/system-$(date +%Y-%m-%d).log

# 搜索错误日志
grep -i error ~/.sightai/logs/system-*.log

# 查看最近的日志
tail -n 100 ~/.sightai/logs/system-$(date +%Y-%m-%d).log
```

## 版本信息

- **当前版本**: 1.0.0
- **Node.js**: 20.x
- **平台支持**: Linux, macOS, Windows
- **许可证**: MIT

## 获取帮助

```bash
sight-ai --help              # 显示帮助
sight-ai --version           # 显示版本
sight-ai interactive --help  # 交互模式帮助
sight-ai backend --help      # 后台模式帮助
sight-ai cli --help          # CLI 模式帮助
```

## 相关链接

- [完整文档](./UNIFIED_APP_DOCUMENTATION.md)
- [使用示例](./USAGE_EXAMPLES.md)
- [CLI 工具文档](../cli-tool/CLI_DOCUMENTATION.md)
- [项目主页](../../README.md)
