# Desktop App - Electron + React + Nest.js

这是一个基于 Electron + React 的桌面应用，集成了 Nest.js 后端服务，使用 nx workspace 进行管理。

## 🏗️ 项目架构

```
desktop-app/
├── src/
│   ├── main/           # Electron 主进程
│   │   └── main.ts     # 主进程入口，包含后端服务集成
│   └── renderer/       # React 渲染进程
│       ├── components/ # React 组件
│       ├── services/   # 前端服务
│       └── main.tsx    # 渲染进程入口
├── resources/          # 应用资源目录
│   └── backend/        # 后端服务文件（生产构建时自动复制）
├── scripts/            # 构建脚本
│   └── copy-backend.js # 后端服务复制脚本
└── project.json        # nx 项目配置
```

## 🚀 开发模式

### 启动开发环境
```bash
# 推荐：启动完整开发环境（React 开发服务器 + Electron）
pnpm desktop:dev

# 或者分别启动
pnpm desktop:serve  # 仅启动 React 开发服务器
pnpm nx electron-dev desktop-app  # 启动 Electron 开发模式
```

### 开发模式特点
- React 应用运行在 `http://localhost:4200` 
- 支持热重载和实时更新
- 后端服务从 `dist/packages/apps/api-server/main.js` 加载
- 自动等待开发服务器启动后再启动 Electron

## 🏭 生产构建

### 构建生产版本
```bash
# 完整生产构建（推荐）
pnpm desktop:build-prod

# 或者分步构建
pnpm nx build api-server                    # 1. 构建后端服务
node packages/apps/desktop-app/scripts/copy-backend.js  # 2. 复制后端到资源目录
pnpm nx build desktop-app --configuration=production    # 3. 构建 React 应用
pnpm nx build-electron desktop-app          # 4. 构建 Electron 主进程
```

### 启动生产版本
```bash
# 启动生产构建的应用
pnpm desktop:start-prod

# 或者直接运行
pnpm electron dist/packages/apps/desktop-app/electron/main.js
```

### 生产模式特点
- React 应用被打包为静态文件
- 后端服务被复制到 `resources/backend/` 目录
- 应用完全自包含，不依赖外部开发服务器
- 优化的构建输出，适合分发

## 📁 资源管理

### 后端服务集成
生产构建时，后端服务会被自动复制到应用资源目录：

```
resources/
└── backend/
    ├── main.js         # 后端服务主文件
    ├── package.json    # 依赖配置
    ├── node_modules/   # 运行时依赖
    └── assets/         # 其他资源文件
```

### 路径解析逻辑
```typescript
// 开发模式：从工作目录读取
// 生产模式：从应用资源目录读取
private getBackendPath(): string {
  if (this.isDev) {
    return join(process.cwd(), 'dist/packages/apps/api-server/main.js');
  } else {
    const resourcesPath = this.getResourcesPath();
    return join(resourcesPath, 'backend/main.js');
  }
}
```

## 🔧 nx 命令参考

### 构建命令
```bash
nx build desktop-app                    # 构建 React 应用
nx build desktop-app --configuration=development  # 开发模式构建
nx build-electron desktop-app          # 构建 Electron 主进程
nx build-production desktop-app        # 完整生产构建流程
```

### 开发命令
```bash
nx serve desktop-app                   # 启动 React 开发服务器
nx electron-dev desktop-app           # 启动 Electron 开发模式
nx electron desktop-app               # 启动 Electron 应用
nx electron-production desktop-app    # 启动生产模式应用
```

### 代码质量
```bash
nx lint desktop-app                    # ESLint 检查
nx test desktop-app                    # 运行单元测试
nx test desktop-app --coverage        # 生成测试覆盖率报告
```

## 🛠️ 技术栈

### 前端技术
- **Electron**: 跨平台桌面应用框架
- **React 18**: 用户界面库
- **TypeScript**: 类型安全的 JavaScript
- **Webpack**: 模块打包工具

### 后端集成
- **Nest.js**: Node.js 后端框架
- **动态加载**: 使用 `require()` 直接加载后端服务
- **生命周期管理**: 完整的服务启动和停止管理

### 开发工具
- **nx**: 单体仓库管理工具
- **concurrently**: 并行进程管理
- **wait-on**: 服务等待工具

## 🔍 故障排除

### 常见问题

1. **后端服务未找到**
   ```
   Backend service not found: /path/to/backend/main.js
   ```
   - 确保先运行 `nx build api-server`
   - 检查 `copy-backend.js` 脚本是否正确执行

2. **webpack 动态 require 问题**
   ```
   Module not found: Error: Can't resolve 'xxx'
   ```
   - 已通过 `eval('require')` 解决
   - 确保 webpack 配置正确

3. **开发服务器连接失败**
   ```
   Failed to load resource: net::ERR_CONNECTION_REFUSED
   ```
   - 确保 React 开发服务器在 4200 端口运行
   - 检查 `concurrently` 和 `wait-on` 配置

### 调试模式
```bash
# 启用详细日志
pnpm nx electron-dev desktop-app --verbose

# 查看构建详情
pnpm nx build desktop-app --verbose
```

## 📦 部署准备

生产构建完成后，以下文件可用于分发：
- `dist/packages/apps/desktop-app/` - React 应用构建输出
- `dist/packages/apps/desktop-app/electron/` - Electron 主进程
- `packages/apps/desktop-app/resources/` - 应用资源（包含后端服务）

可以使用 Electron Builder 或类似工具进行最终打包和分发。
