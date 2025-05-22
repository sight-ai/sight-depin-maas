# Sight AI 统一应用文档

## 概述

Sight AI 统一应用是一个集成的管理界面，将后台服务和 CLI 工具整合到一个统一的交互式应用中。它提供了一站式的解决方案来管理 Sight AI 矿工节点的所有功能。

## 核心特性

### 🚀 后台服务管理
- 一键启动/停止后台服务
- 实时服务状态监控
- 自动健康检查
- 智能启动超时处理

### 🎛️ CLI 工具集成
- 无缝集成所有 CLI 功能
- 统一的用户界面
- 自动返回主菜单
- 错误处理和恢复

### 📊 性能监控
- 实时系统资源监控
- 历史性能数据
- 健康评分系统
- 详细的性能分析

### ⚙️ 应用设置
- 多主题支持
- 个性化配置
- 快捷键设置
- 自动保存偏好

## 安装和构建

### 前提条件
- Node.js 20+
- 已构建的 CLI 工具
- 已配置的后台服务

### 构建应用
```bash
# 在 unified-app 目录下
cd backend/packages/apps/unified-app

# 安装依赖
npm install

# 构建应用
npm run build

# 或使用开发模式
npm run dev
```

### 全局安装
```bash
# 构建后全局安装
npm link

# 现在可以在任何地方使用
sight-ai --help
```

## 使用方法

### 基本命令

```bash
# 启动交互式管理界面（默认）
sight-ai
sight-ai interactive

# 直接启动后台服务
sight-ai backend

# 直接运行 CLI 命令
sight-ai cli [command]
```

### 交互式界面

#### 主菜单功能

1. **🚀/🛑 启动/停止后台服务**
   - 智能检测服务状态
   - 实时启动进度显示
   - 自动超时处理（30秒）
   - 优雅停止机制

2. **🔗 网关注册管理**
   - 调用 CLI 注册功能
   - 自动返回主菜单
   - 完整的注册流程

3. **🤖 模型上报管理**
   - 集成模型管理功能
   - 支持所有模型操作
   - 实时状态反馈

4. **📊 运行状态监控**
   - 系统资源监控
   - 服务状态检查
   - 矿工状态查看

5. **🎛️ CLI 交互模式**
   - 完整的 CLI 功能
   - 无缝集成体验
   - 自动错误处理

6. **🔧 检查服务状态**
   - 详细的系统状态报告
   - 文件状态检查
   - 进程状态监控

7. **⚙️ 应用设置**
   - 主题切换
   - 功能开关
   - 配置管理

8. **📈 性能监控**
   - 实时性能指标
   - 历史数据分析
   - 健康评分

9. **📋 查看日志**
   - 集成日志管理
   - 多类型日志支持
   - 搜索和过滤

## 配置系统

### 配置文件位置
```
~/.sightai/unified-app-config.json
```

### 配置选项

```typescript
interface UnifiedAppConfig {
  theme: 'default' | 'minimal' | 'colorful';     // 主题设置
  autoStartBackend: boolean;                      // 自动启动后台
  showDetailedLogs: boolean;                      // 详细日志
  checkUpdates: boolean;                          // 检查更新
  language: 'zh-CN' | 'en-US';                   // 语言设置
  shortcuts: { [key: string]: string };          // 快捷键
  lastUsed: {                                     // 最后使用
    command?: string;
    timestamp: number;
  };
}
```

### 默认配置
```json
{
  "theme": "default",
  "autoStartBackend": false,
  "showDetailedLogs": false,
  "checkUpdates": true,
  "language": "zh-CN",
  "shortcuts": {
    "q": "exit",
    "s": "status", 
    "r": "register",
    "m": "model",
    "b": "backend"
  }
}
```

## 主题系统

### 可用主题

1. **默认主题 (default)**
   - 蓝色系配色
   - 清晰的视觉层次
   - 适合长时间使用

2. **简约主题 (minimal)**
   - 黑白配色
   - 极简设计
   - 减少视觉干扰

3. **彩色主题 (colorful)**
   - 多彩配色
   - 丰富的视觉效果
   - 活跃的界面风格

### 主题切换
```bash
# 在应用设置中切换主题
⚙️ 应用设置 → 🎨 主题设置
```

## 性能监控系统

### 监控指标

**系统资源：**
- 内存使用率和总量
- CPU 使用率和核心数
- 应用运行时间
- 后台服务状态
- API 响应时间

**历史数据：**
- 最近100个数据点
- 5分钟平均值
- 性能趋势分析

**健康评分：**
- 内存使用率影响（30%权重）
- CPU 使用率影响（30%权重）
- 服务状态影响（40%权重）
- 响应时间影响（额外）

### 健康状态等级
- **Excellent** (90-100分): 系统运行优秀
- **Good** (70-89分): 系统运行良好
- **Fair** (50-69分): 系统运行一般
- **Poor** (0-49分): 系统需要关注

## 后台服务管理

### 启动流程
1. 检测项目根目录
2. 执行 `npx nx serve api-server`
3. 监听启动输出
4. 实时显示启动进度
5. 健康检查确认
6. 30秒超时保护

### 停止流程
1. 发送 SIGTERM 信号
2. 等待优雅退出
3. 10秒超时强制终止
4. 清理进程资源

### 状态检查
- HTTP 健康检查 (localhost:8716/api/v1/health)
- 3秒连接超时
- 自动重试机制

## CLI 工具集成

### 集成方式
- 子进程调用
- 继承标准输入输出
- 自动错误处理
- 优雅退出处理

### 支持的命令
```bash
sight-ai cli register    # 网关注册
sight-ai cli model      # 模型管理  
sight-ai cli status     # 状态监控
sight-ai cli logs       # 日志管理
sight-ai cli            # 交互模式
```

### 错误处理
- 自动捕获退出代码
- 友好的错误提示
- 自动返回主菜单
- 超时保护机制

## 日志系统

### 日志文件
```
~/.sightai/logs/system-YYYY-MM-DD.log
```

### 日志级别
- **INFO**: 一般信息记录
- **WARN**: 警告信息
- **ERROR**: 错误信息

### 日志内容
- 应用启动/停止
- 用户操作记录
- 服务状态变化
- 错误和异常

## 快捷键系统

### 默认快捷键
- `q`: 退出应用
- `s`: 状态监控
- `r`: 网关注册
- `m`: 模型管理
- `b`: 后台服务

### 自定义快捷键
可以在应用设置中自定义快捷键映射。

## 故障排除

### 常见问题

**1. 后台服务启动失败**
```bash
# 检查端口占用
netstat -an | grep 8716

# 检查项目结构
ls -la nx.json

# 手动启动测试
npx nx serve api-server
```

**2. CLI 工具未找到**
```bash
# 检查 CLI 工具是否已构建
ls -la packages/apps/cli-tool/dist/main.js

# 重新构建 CLI 工具
cd packages/apps/cli-tool && npm run build
```

**3. 配置文件损坏**
```bash
# 删除配置文件重置
rm ~/.sightai/unified-app-config.json

# 重启应用自动重建配置
sight-ai
```

**4. 性能监控异常**
- 检查系统资源是否充足
- 确认网络连接正常
- 重启应用重置监控

### 调试模式
```bash
# 使用开发模式获取详细输出
npm run dev

# 查看系统日志
tail -f ~/.sightai/logs/system-$(date +%Y-%m-%d).log
```

## 开发信息

### 项目结构
```
src/
├── main.ts              # 主入口文件
├── utils/
│   ├── config.ts        # 配置管理
│   ├── theme.ts         # 主题系统
│   └── performance.ts   # 性能监控
```

### 核心类

**SightAIUnified**
- 主应用类
- 管理后台服务生命周期
- 处理用户交互
- 集成所有功能模块

**ConfigManager**
- 配置文件管理
- 设置持久化
- 默认值处理

**ThemeManager**
- 主题切换
- 颜色管理
- UI 组件样式

**PerformanceMonitor**
- 性能数据收集
- 历史数据管理
- 健康评分计算

### 扩展开发

添加新功能的步骤：
1. 在主菜单添加选项
2. 实现对应的处理方法
3. 更新配置和主题支持
4. 添加错误处理
5. 更新文档

## 版本信息

- **当前版本**: 1.0.0
- **Node.js**: 20.x
- **主要依赖**: Commander.js, Inquirer, Chalk, Ora
- **许可证**: MIT

## 更新日志

### v1.0.0
- 初始版本发布
- 集成后台服务管理
- 集成 CLI 工具
- 性能监控系统
- 多主题支持
- 配置管理系统
