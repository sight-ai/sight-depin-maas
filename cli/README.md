# Sight AI Miner CLI

A command-line tool for running and managing Sight AI mining software.

## Features

- Support for local and remote operation modes
- Automatic system requirements and GPU information detection
- Interactive and command-line parameter configuration
- Simplified Docker management
- Cross-platform support (Windows, macOS, Linux)

## Usage

### Direct Run (Recommended)

```bash
npx @sight-ai/sight-cli run --mode local
```

### Global Installation (Optional)

```bash
npm install -g @sight-ai/sight-cli
sight-cli run --mode local
```

## Prerequisites

The following components are required to use this CLI tool:

- Docker (20.10.0+)
- Docker Compose (2.0.0+)
- Ollama service running

## Command Overview

```
sight-cli [command] [options]
```

### Commands

- `run`: Run the mining software
- `status`: Check mining software status
- `stop`: Stop the mining software
- `logs`: View mining software logs
- `update`: Update mining software to latest version

### Options

- `-m, --mode <mode>`: Operation mode (local or remote)
- `-g, --gateway-url <URL>`: Gateway API URL (remote mode)
- `-n, --node-code <code>`: Node code (remote mode)
- `-k, --gateway-api-key <key>`: Gateway API key (remote mode)
- `-r, --reward-address <address>`: Reward address (remote mode)
- `-a, --api-base-path <path>`: API server base path (remote mode)
- `-h, --help`: Show help information
- `-V, --version`: Show version number

### Running Examples

#### Interactive Mode

```bash
npx @sight-ai/sight-cli run
```

#### Local Mode

```bash
npx @sight-ai/sight-cli run --mode local
```

#### Remote Mode

```bash
npx @sight-ai/sight-cli run --mode remote --gateway-url https://example.com --node-code ABC123 --gateway-api-key YOUR_KEY --reward-address YOUR_ADDRESS --api-base-path /api
```

## How It Works

1. CLI tool first checks system requirements (Docker and Docker Compose)
2. Detects if Ollama service is running
3. Pulls required AI models
4. Collects GPU information
5. Creates configuration file based on selected mode
6. Starts Docker container services
7. Opens mining dashboard and Web UI interface

## Logs and Cache

- Log files are located in `.sightai/logs` folder in user's home directory
- Cache files are located in `.sightai/cache` folder in user's home directory

### Test CLI Locally

```bash
node bin/index.js run
```
