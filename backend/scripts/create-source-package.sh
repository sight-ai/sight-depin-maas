#!/bin/bash

# 设置错误时退出
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
function log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

function log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

function log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 设置工作目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
DIST_PKG_DIR="${BACKEND_DIR}/dist-pkg"
cd "$BACKEND_DIR"

# 检查 dist-pkg 目录是否存在
if [ ! -d "$DIST_PKG_DIR" ]; then
  log_error "dist-pkg directory not found. Please run the packaging script first."
  exit 1
fi

# 检查 Linux 可执行文件是否存在
LINUX_EXECUTABLE="${DIST_PKG_DIR}/sightai"
if [ ! -f "$LINUX_EXECUTABLE" ]; then
  log_error "Linux executable not found at ${LINUX_EXECUTABLE}. Please run the packaging script first."
  exit 1
fi

# 创建临时目录
TEMP_DIR=$(mktemp -d)
log_info "Creating temporary directory at ${TEMP_DIR}"

# 复制 Linux 可执行文件到临时目录
cp "$LINUX_EXECUTABLE" "${TEMP_DIR}/sightai"
chmod +x "${TEMP_DIR}/sightai"

# 创建 source.gz 文件
log_info "Creating sightai.gz package..."
tar -czf "${DIST_PKG_DIR}/sightai.gz" -C "$TEMP_DIR" .

# 清理临时目录
rm -rf "$TEMP_DIR"

log_success "Package created at ${DIST_PKG_DIR}/sightai.gz"
