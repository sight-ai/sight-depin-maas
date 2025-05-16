# Sight AI Miner CLI / Sight AI 挖矿命令行工具

A command-line tool for running and managing Sight AI mining software.  
用于运行和管理Sight AI挖矿软件的命令行工具。

## Features / 功能特点

- Support for local and remote operation modes  
  支持本地模式和远程模式运行
- Automatic system requirements and GPU information detection  
  自动检测系统要求和GPU信息
- Interactive and command-line parameter configuration  
  提供交互式和命令行参数配置方式
- Simplified Docker management  
  简化Docker管理
- Cross-platform support (Windows, macOS, Linux)  
  支持各种平台(Windows, macOS, Linux)

## Usage / 使用方法

### Direct Run (Recommended) / 直接运行（推荐）

```bash
npx @sight-ai/miner-cli run --mode local
```

### Global Installation (Optional) / 全局安装（可选）

```bash
npm install -g @sight-ai/miner-cli
sight-miner run --mode local
```

## Prerequisites / 前提条件

The following components are required to use this CLI tool:  
使用此CLI工具需要以下组件:

- Docker (20.10.0+)
- Docker Compose (2.0.0+)
- Ollama service running  
  Ollama服务已运行

## Command Overview / 命令概览

```
sight-miner [command] [options]
```

### Commands / 命令

- `run`: Run the mining software / 运行挖矿软件
- `status`: Check mining software status / 检查挖矿软件状态
- `stop`: Stop the mining software / 停止挖矿软件
- `logs`: View mining software logs / 查看挖矿软件日志
- `update`: Update mining software to latest version / 更新挖矿软件到最新版本

### Options / 选项

- `-m, --mode <mode>`: Operation mode (local or remote) / 运行模式 (local或remote)
- `-g, --gateway-url <URL>`: Gateway API URL (remote mode) / 网关API URL (远程模式)
- `-n, --node-code <code>`: Node code (remote mode) / 节点代码 (远程模式)
- `-k, --gateway-api-key <key>`: Gateway API key (remote mode) / 网关API密钥 (远程模式)
- `-r, --reward-address <address>`: Reward address (remote mode) / 奖励地址 (远程模式)
- `-a, --api-base-path <path>`: API server base path (remote mode) / API服务器基础路径 (远程模式)
- `-h, --help`: Show help information / 显示帮助信息
- `-V, --version`: Show version number / 显示版本号

### Running Examples / 运行示例

#### Interactive Mode / 交互模式运行

```bash
npx @sight-ai/miner-cli run
```

#### Local Mode / 本地模式运行

```bash
npx @sight-ai/miner-cli run --mode local
```

#### Remote Mode / 远程模式运行

```bash
npx @sight-ai/miner-cli run --mode remote --gateway-url https://example.com --node-code ABC123 --gateway-api-key YOUR_KEY --reward-address YOUR_ADDRESS --api-base-path /api
```

## How It Works / 工作原理

1. CLI tool first checks system requirements (Docker and Docker Compose)  
   CLI工具会首先检查系统要求(Docker和Docker Compose)
2. Detects if Ollama service is running  
   检测Ollama服务是否运行
3. Pulls required AI models  
   拉取所需的AI模型
4. Collects GPU information  
   收集GPU信息
5. Creates configuration file based on selected mode  
   根据所选模式创建配置文件
6. Starts Docker container services  
   启动Docker容器服务
7. Opens mining dashboard and Web UI interface  
   打开挖矿仪表板和Web UI界面

## Logs and Cache / 日志和缓存

- Log files are located in `.sight-miner/logs` folder in user's home directory  
  日志文件位于用户主目录下的`.sight-miner/logs`文件夹中
- Cache files are located in `.sight-miner/cache` folder in user's home directory  
  缓存文件位于用户主目录下的`.sight-miner/cache`文件夹中

## Development / 开发

### Start Development / 开始开发

```bash
git clone <repository URL>
cd sight-miner-cli
npm install
```

### Test CLI Locally / 本地测试CLI

```bash
node bin/index.js run
```