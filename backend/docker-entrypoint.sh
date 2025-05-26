#!/bin/bash

# Docker 入口点脚本
# 支持多种启动模式和 CLI 操作

set -e

# 设置默认数据目录
export SIGHTAI_DATA_DIR="${SIGHTAI_DATA_DIR:-/data}"

# 确保数据目录存在
mkdir -p "$SIGHTAI_DATA_DIR"

# 设置工作目录
cd /app/dist/packages

# 显示欢迎信息
echo "🚀 SightAI Docker Container"
echo "📁 Data directory: $SIGHTAI_DATA_DIR"
echo "🌐 API URL: ${OLLAMA_API_URL:-http://host.docker.internal:11434/}"
echo ""

# 处理不同的启动模式
case "$1" in
    "start")
        echo "🔧 Starting SightAI backend server..."
        exec node /app/dist/packages/apps/api-server/main.js
        ;;

    "cli")
        echo "💻 Starting interactive CLI mode..."
        shift  # 移除 'cli' 参数
        if [ $# -eq 0 ]; then
            # 没有额外参数，启动交互式 CLI
            exec node /app/dist/packages/apps/cli-wrapper/main.js
        else
            # 有额外参数，执行特定的 CLI 命令
            exec node /app/dist/packages/apps/cli-wrapper/main.js "$@"
        fi
        ;;

    "register")
        echo "📋 Running device registration..."
        shift  # 移除 'register' 参数
        exec node /app/dist/packages/apps/cli-wrapper/main.js register "$@"
        ;;

    "status")
        echo "📊 Checking device status..."
        exec node /app/dist/packages/apps/cli-wrapper/main.js status
        ;;

    "logs")
        echo "📄 Viewing logs..."
        exec node /app/dist/packages/apps/cli-wrapper/main.js logs
        ;;

    "models")
        echo "🤖 Managing models..."
        shift  # 移除 'models' 参数
        exec node /app/dist/packages/apps/cli-wrapper/main.js models "$@"
        ;;

    "daemon")
        echo "🔄 Starting in daemon mode..."
        # 启动后端服务并保持容器运行
        node /app/dist/packages/apps/api-server/main.js &

        # 等待服务启动
        sleep 3

        echo "✅ Backend service started in background"
        echo "💡 You can now use CLI commands:"
        echo "   docker exec sightai sight register ..."
        echo "   docker exec sightai sight status"
        echo "   docker exec sightai sight logs"

        # 保持容器运行
        tail -f /dev/null
        ;;

    "bash"|"sh")
        echo "🐚 Starting shell..."
        exec /bin/bash
        ;;

    "help"|"--help"|"-h")
        echo "📖 SightAI Docker Usage:"
        echo ""
        echo "🔧 Service Management:"
        echo "  docker run sightai:latest start                    # Start backend server (default)"
        echo "  docker run sightai:latest daemon                   # Start in daemon mode"
        echo ""
        echo "💻 CLI Operations:"
        echo "  docker run -it sightai:latest cli                  # Interactive CLI"
        echo "  docker run sightai:latest register [options]       # Device registration"
        echo "  docker run sightai:latest status                   # Check device status"
        echo "  docker run sightai:latest logs                     # View logs"
        echo "  docker run sightai:latest models [command]         # Model management"
        echo ""
        echo "🐚 Development:"
        echo "  docker run -it sightai:latest bash                 # Shell access"
        echo ""
        echo "📋 Examples:"
        echo "  # Start service with data persistence"
        echo "  docker run -d -p 8716:8716 -v sightai-data:/data sightai:latest daemon"
        echo ""
        echo "  # Register device"
        echo "  docker run --rm -v sightai-data:/data sightai:latest register \\"
        echo "    --code 'YOUR_CODE' \\"
        echo "    --gateway 'https://gateway.saito.ai' \\"
        echo "    --reward 'YOUR_REWARD_ADDRESS' \\"
        echo "    --key 'YOUR_KEY' \\"
        echo "    --base-path '/api/model'"
        echo ""
        echo "  # Run in daemon mode and use CLI separately"
        echo "  docker run -d --name sightai -p 8716:8716 -v sightai-data:/data sightai:latest daemon"
        echo "  docker exec sightai sight status"
        echo "  docker exec sightai sight register [options]"
        echo ""
        exit 0
        ;;

    *)
        # 如果第一个参数不是预定义的命令，尝试作为 CLI 命令执行
        if [ -n "$1" ]; then
            echo "🔍 Executing CLI command: $*"
            exec node /app/dist/packages/apps/cli-wrapper/main.js "$@"
        else
            # 默认启动后端服务
            echo "🔧 Starting SightAI backend server (default)..."
            exec node /app/dist/packages/apps/api-server/main.js
        fi
        ;;
esac
