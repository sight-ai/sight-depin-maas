#!/bin/bash

# Sight AI 增强版启动脚本
# 提供更好的用户体验和错误处理

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 图标定义
ROCKET="🚀"
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
GEAR="⚙️"

# 显示横幅
show_banner() {
    clear
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                 Sight AI 增强版启动器                     ║"
    echo "║                       v1.0.0                             ║"
    echo "╠═══════════════════════════════════════════════════════════╣"
    echo "║  ${ROCKET} 智能检测和自动修复                                    ║"
    echo "║  ${CHECK} 依赖检查和环境验证                                    ║"
    echo "║  ${GEAR} 自动编译和优化                                        ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 日志函数
log_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

log_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

log_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

# 检查是否在正确的目录
check_directory() {
    if [ ! -f "package.json" ]; then
        log_error "错误: 请在 backend 目录下运行此脚本"
        exit 1
    fi
    log_success "目录检查通过"
}

# 检查 Node.js 版本
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        echo -e "${YELLOW}请访问 https://nodejs.org 安装 Node.js${NC}"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_warning "Node.js 版本较低 (当前: $(node --version))，推荐使用 18+"
    else
        log_success "Node.js 版本检查通过 ($(node --version))"
    fi
}

# 检查端口是否可用
check_ports() {
    local ports=(8716 11434)
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            if [ "$port" = "8716" ]; then
                log_warning "端口 $port 已被占用 (可能是后台服务已在运行)"
            else
                log_warning "端口 $port 已被占用 (Ollama 服务)"
            fi
        else
            log_success "端口 $port 可用"
        fi
    done
}

# 检查和编译统一应用
check_and_compile() {
    local unified_path="packages/apps/unified-app"
    local cli_path="packages/apps/cli-tool"
    
    log_info "检查应用编译状态..."
    
    # 检查统一应用
        log_warning "统一应用未编译，正在编译..."
        cd $unified_path
        npm install --silent
        npx tsc -p tsconfig.app.json
        chmod +x dist/main.js
        cd ../../../
        log_success "统一应用编译完成"
  
  
        log_warning "CLI 工具未编译，正在编译..."
        cd $cli_path
        npm install --silent
        npx tsc -p tsconfig.app.json
        chmod +x dist/main.js
        cd ../../../
        log_success "CLI 工具编译完成"
   
}

# 显示使用提示
show_usage() {
    echo -e "\n${CYAN}使用方法:${NC}"
    echo "  $0                    # 启动交互式界面"
    echo "  $0 backend            # 直接启动后台服务"
    echo "  $0 cli <command>      # 直接运行 CLI 命令"
    echo "  $0 status             # 检查系统状态"
    echo "  $0 --help             # 显示帮助信息"
    echo ""
    echo -e "${CYAN}示例:${NC}"
    echo "  $0 cli register       # 网关注册"
    echo "  $0 cli model          # 模型管理"
    echo "  $0 cli status         # 状态监控"
}

# 主函数
main() {
    show_banner
    
    # 基础检查
    log_info "开始系统检查..."
    check_directory
    check_nodejs
    check_ports
    check_and_compile
    
    log_success "所有检查完成！"
    
    # 根据参数执行不同操作
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    elif [ "$1" = "status" ]; then
        log_info "检查系统状态..."
        node packages/apps/unified-app/dist/main.js check-status
        exit 0
    else
        echo -e "${PURPLE}${ROCKET} 准备就绪！${NC}\n"
        sleep 1
        
        # 启动统一应用
        node packages/apps/unified-app/dist/main.js "$@"
    fi
}

# 错误处理
trap 'log_error "脚本执行中断"; exit 1' INT TERM

# 运行主函数
main "$@"
