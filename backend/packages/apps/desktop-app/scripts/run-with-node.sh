#!/bin/bash

# Node.js 环境包装脚本
# 确保在正确的 Node.js 环境中运行脚本

set -e

# 检测 Node.js 环境
detect_node() {
    # 1. 检查是否已经有 node 命令可用
    if command -v node >/dev/null 2>&1; then
        echo "✅ 使用系统 Node.js: $(node --version)"
        return 0
    fi
    
    # 2. 尝试加载 nvm
    if [ -f ~/.nvm/nvm.sh ]; then
        echo "🔧 加载 nvm 环境..."
        source ~/.nvm/nvm.sh
        if command -v node >/dev/null 2>&1; then
            echo "✅ 使用 nvm Node.js: $(node --version)"
            return 0
        fi
    fi
    
    # 3. 检查 homebrew node
    if [ -f /opt/homebrew/bin/node ]; then
        export PATH="/opt/homebrew/bin:$PATH"
        echo "✅ 使用 Homebrew Node.js: $(node --version)"
        return 0
    fi
    
    # 4. 检查其他常见路径
    for node_path in /usr/local/bin/node /usr/bin/node; do
        if [ -f "$node_path" ]; then
            export PATH="$(dirname $node_path):$PATH"
            echo "✅ 使用 Node.js: $($node_path --version)"
            return 0
        fi
    done
    
    echo "❌ 找不到 Node.js，请确保已安装 Node.js"
    exit 1
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        echo "用法: $0 <script.js> [参数...]"
        echo "示例: $0 packages/apps/desktop-app/scripts/copy-backend.js"
        exit 1
    fi
    
    echo "🚀 运行 Node.js 脚本: $1"
    
    # 检测并设置 Node.js 环境
    detect_node
    
    # 运行脚本
    echo "📦 执行: node $@"
    node "$@"
}

# 运行主函数
main "$@"
