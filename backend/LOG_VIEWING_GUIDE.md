# SightAI Desktop 日志查看指南

## 概述
SightAI Desktop 应用程序现在包含了完整的日志记录系统，可以帮助您监控和调试应用程序的运行状态。

## 日志文件位置
日志文件存储在以下位置：
```
/Users/hej/Library/Application Support/@saito-miner/sightai/logs/
```

## 日志文件命名规则
日志文件按日期命名：
```
sightai-YYYY-MM-DD.log
```
例如：`sightai-2025-07-04.log`

## 查看日志的方法

### 1. 使用提供的脚本
我们提供了一个便捷的日志查看脚本：
```bash
cd backend
./view-logs.sh
```

这个脚本会：
- 显示日志文件信息
- 显示最新的20条日志
- 开始实时监控日志（按 Ctrl+C 退出）

### 2. 使用命令行工具

#### 查看完整日志
```bash
cat "/Users/hej/Library/Application Support/@saito-miner/sightai/logs/sightai-$(date +%Y-%m-%d).log"
```

#### 查看最新日志
```bash
tail -20 "/Users/hej/Library/Application Support/@saito-miner/sightai/logs/sightai-$(date +%Y-%m-%d).log"
```

#### 实时监控日志
```bash
tail -f "/Users/hej/Library/Application Support/@saito-miner/sightai/logs/sightai-$(date +%Y-%m-%d).log"
```

#### 搜索特定内容
```bash
grep "ERROR" "/Users/hej/Library/Application Support/@saito-miner/sightai/logs/sightai-$(date +%Y-%m-%d).log"
```

### 3. 通过应用程序菜单
在 SightAI Desktop 应用程序中：
1. 点击菜单栏的 "File" 菜单
2. 选择 "View Logs"
3. 这将打开日志文件所在的目录

## 日志级别
日志包含以下级别：
- **INFO**: 一般信息，如服务启动、状态变化
- **WARN**: 警告信息
- **ERROR**: 错误信息
- **DEBUG**: 调试信息

## 日志内容说明

### 应用程序启动日志
```
[2025-07-04T13:45:32.492Z] [INFO] === SightAI Desktop Application Started ===
[2025-07-04T13:45:32.493Z] [INFO] Version: 0.0.0
[2025-07-04T13:45:32.493Z] [INFO] Platform: darwin arm64
[2025-07-04T13:45:32.493Z] [INFO] Node.js: v22.17.0
[2025-07-04T13:45:32.493Z] [INFO] Electron: 37.2.0
[2025-07-04T13:45:32.493Z] [INFO] Development mode: false
```

### 服务启动日志
```
[2025-07-04T13:45:32.553Z] [INFO] App is ready, starting services...
[2025-07-04T13:45:32.554Z] [INFO] Starting backend service: [path]
[2025-07-04T13:45:32.554Z] [INFO] Running in production mode
[2025-07-04T13:45:34.228Z] [INFO] Backend service started successfully and is ready
[2025-07-04T13:45:34.228Z] [INFO] Backend service started, now starting libp2p service...
[2025-07-04T13:45:34.229Z] [INFO] Starting libp2p service with cross-platform launcher...
[2025-07-04T13:45:34.233Z] [INFO] LibP2P service started successfully
```

### 窗口创建日志
```
[2025-07-04T13:45:34.233Z] [INFO] All services startup completed, creating window...
[2025-07-04T13:45:34.284Z] [INFO] Window created successfully
[2025-07-04T13:45:34.284Z] [INFO] Notifying renderer that backend is ready...
[2025-07-04T13:45:34.284Z] [INFO] Backend status notification sent
```

## 故障排除

### 如果日志文件不存在
1. 确认应用程序已经启动
2. 检查日志目录是否存在：
   ```bash
   ls -la "/Users/hej/Library/Application Support/@saito-miner/sightai/"
   ```

### 如果需要查看历史日志
历史日志文件会保留在同一目录中，按日期命名。您可以查看之前日期的日志：
```bash
ls -la "/Users/hej/Library/Application Support/@saito-miner/sightai/logs/"
```

## 日志轮转
- 每天创建一个新的日志文件
- 旧的日志文件会保留，不会自动删除
- 如需清理旧日志，可以手动删除不需要的文件

## 性能考虑
- 日志文件会随着时间增长
- 建议定期检查日志文件大小
- 如果日志文件过大，可以考虑重启应用程序来开始新的日志文件

## 支持
如果您在查看日志时遇到问题，请检查：
1. 文件权限是否正确
2. 磁盘空间是否充足
3. 应用程序是否正常运行
