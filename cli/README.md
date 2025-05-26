# Sight AI Miner CLI

A command-line tool for running and managing Sight AI mining software.

## Features

- Support for local and remote operation modes
- Automatic GPU information detection
- Interactive and command-line parameter configuration
- Direct communication with Sight AI Miner API (port 8716)
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

- Ollama service running on port 11434
- Sight AI Miner service running on port 8716

## Command Overview

```
sight-cli [command] [options]
```

### Commands

- `run`: Connect to and interact with the mining software
- `register`: Register device with gateway
- `re-register`: Re-register device using saved parameters
- `report-models`: Report available models to gateway
- `status`: Check mining software status

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

1. CLI tool detects if Ollama service is running on port 11434
2. Pulls required AI models via Ollama
3. Collects GPU information from the system
4. Communicates with Sight AI Miner API on port 8716
5. Registers device with gateway (remote mode)
6. Reports available models to gateway
7. Opens mining dashboard interface

## Logs and Cache

- Log files are located in `.sightai/logs` folder in user's home directory
- Cache files are located in `.sightai/cache` folder in user's home directory

### Test CLI Locally

```bash
node bin/index.js run
```
