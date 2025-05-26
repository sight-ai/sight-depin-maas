#!/bin/bash

# SightAI CLI 包装脚本
# 用于在 Docker 容器中全局访问 sight 命令

# 设置工作目录
cd /app/dist/packages

# 执行 CLI 命令，传递所有参数
exec node /app/dist/packages/apps/cli-wrapper/main.js "$@"
