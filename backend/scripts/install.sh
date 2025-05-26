#!/bin/sh
# This script installs SightAI Miner on Linux and sets up autostart.
# It detects the current operating system architecture and installs the appropriate version.

set -eu

# 颜色定义
red="$( (/usr/bin/tput bold || :; /usr/bin/tput setaf 1 || :) 2>&-)"
green="$( (/usr/bin/tput bold || :; /usr/bin/tput setaf 2 || :) 2>&-)"
yellow="$( (/usr/bin/tput bold || :; /usr/bin/tput setaf 3 || :) 2>&-)"
plain="$( (/usr/bin/tput sgr0 || :) 2>&-)"

# 消息函数
status() { echo ">>> $*" >&2; }
success() { echo "${green}SUCCESS:${plain} $*"; }
error() { echo "${red}ERROR:${plain} $*"; exit 1; }
warning() { echo "${red}WARNING:${plain} $*"; }
dryrun() { echo "${yellow}DRY-RUN:${plain} $*"; }

# 检查是否为干运行模式
DRY_RUN=false
if [ "$#" -gt 0 ] && [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  status "Running in dry-run mode. No changes will be made to the system."
fi

# 临时目录
TEMP_DIR=$(mktemp -d)
cleanup() { rm -rf $TEMP_DIR; }
trap cleanup EXIT

# 检查命令是否可用
available() { command -v $1 >/dev/null; }
require() {
    local MISSING=''
    for TOOL in $*; do
        if ! available $TOOL; then
            MISSING="$MISSING $TOOL"
        fi
    done
    echo $MISSING
}

# 检查是否为Linux系统
[ "$(uname -s)" = "Linux" ] || error 'This script is intended to run on Linux only.'

# 检测架构
ARCH=$(uname -m)
case "$ARCH" in
    x86_64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) error "Unsupported architecture: $ARCH" ;;
esac

# 设置sudo
SUDO=
if [ "$(id -u)" -ne 0 ]; then
    if ! available sudo; then
        error "This script requires superuser permissions. Please re-run as root."
    fi
    SUDO="sudo"
fi

# 检查必要工具
NEEDS=$(require curl grep sed systemctl)
if [ -n "$NEEDS" ]; then
    status "ERROR: The following tools are required but missing:"
    for NEED in $NEEDS; do
        echo "  - $NEED"
    done
    exit 1
fi

# 设置安装目录
INSTALL_DIR="/opt/sightai"
CONFIG_DIR="/etc/sightai"
LOG_DIR="/var/log/sightai"
BIN_PATH="/usr/local/bin/sightai"

# 设置下载URL
DOWNLOAD_URL="https://github.com/sight-ai/sight-depin-maas/releases/download/0.0.1/sightai-linux-amd64.gz"
DOWNLOAD_FILE="${TEMP_DIR}/sightai.gz"

# 创建目录
status "Creating directories..."
if [ "$DRY_RUN" = true ]; then
    dryrun "Would create directories: $INSTALL_DIR $CONFIG_DIR $LOG_DIR"
else
    $SUDO mkdir -p "$INSTALL_DIR" "$CONFIG_DIR" "$LOG_DIR"
fi

# 清理旧版本
if [ -f "$BIN_PATH" ]; then
    status "Removing old version..."
    if [ "$DRY_RUN" = true ]; then
        dryrun "Would remove old binary: $BIN_PATH"
    else
        $SUDO rm -f "$BIN_PATH"
    fi
fi

# 下载安装包
status "Downloading SightAI from ${DOWNLOAD_URL}..."
if [ "$DRY_RUN" = true ]; then
    dryrun "Would download from $DOWNLOAD_URL to $DOWNLOAD_FILE"
else
    if ! curl -fsSL "$DOWNLOAD_URL" -o "$DOWNLOAD_FILE"; then
        error "Failed to download from $DOWNLOAD_URL"
    fi
fi

# 从下载的文件安装
status "Installing SightAI for Linux ${ARCH}..."
if [ "$DRY_RUN" = true ]; then
    dryrun "Would extract $DOWNLOAD_FILE to $INSTALL_DIR"
else
    $SUDO tar -xzf "$DOWNLOAD_FILE" -C "$INSTALL_DIR"
fi

# 创建符号链接
status "Creating symlink in /usr/local/bin..."
if [ "$DRY_RUN" = true ]; then
    dryrun "Would create symlink from $INSTALL_DIR/sightai to $BIN_PATH"
    dryrun "Would make $BIN_PATH executable"
else
    $SUDO ln -sf "$INSTALL_DIR/sightai" "$BIN_PATH"
    $SUDO chmod +x "$BIN_PATH"
fi

# 创建systemd服务
status "Creating systemd service..."
SERVICE_CONTENT="[Unit]
Description=SightAI Miner Service
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=$BIN_PATH
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/stdout.log
StandardError=append:$LOG_DIR/stderr.log
# 如果需要环境变量，请取消注释并设置
#Environment=\"VAR1=value1\"
#Environment=\"VAR2=value2\"

[Install]
WantedBy=multi-user.target"

if [ "$DRY_RUN" = true ]; then
    dryrun "Would create systemd service file at /etc/systemd/system/sightai.service with content:"
    echo "$SERVICE_CONTENT"
else
    echo "$SERVICE_CONTENT" | $SUDO tee /etc/systemd/system/sightai.service >/dev/null
fi

# 启用并启动服务
status "Enabling and starting SightAI Miner service..."
if [ "$DRY_RUN" = true ]; then
    dryrun "Would reload systemd daemon"
    dryrun "Would enable sightai.service"
    dryrun "Would start sightai.service"
    success "SightAI Miner would be installed and started successfully!"
    status "Service would be running. Logs would be at $LOG_DIR"
    status "To check status: systemctl status sightai"
    status "To stop service: systemctl stop sightai"
    status "To start service: systemctl start sightai"
else
    $SUDO systemctl daemon-reload
    $SUDO systemctl enable sightai.service
    $SUDO systemctl restart sightai.service

    # 检查服务状态
    if $SUDO systemctl is-active --quiet sightai.service; then
        success "SightAI Miner has been installed and started successfully!"
        status "Service is running. Check logs at $LOG_DIR"
        status "To check status: systemctl status sightai"
        status "To stop service: systemctl stop sightai"
        status "To start service: systemctl start sightai"
    else
        warning "SightAI Miner service failed to start. Check logs with: journalctl -u sightai.service"
    fi
fi

# 创建卸载脚本
UNINSTALL_CONTENT="#!/bin/sh
set -e
echo \"Uninstalling SightAI Miner...\"
systemctl stop sightai.service || true
systemctl disable sightai.service || true
rm -f /etc/systemd/system/sightai.service
systemctl daemon-reload
rm -f $BIN_PATH
rm -rf $INSTALL_DIR
echo \"SightAI Miner has been uninstalled.\""

if [ "$DRY_RUN" = true ]; then
    dryrun "Would create uninstall script at $INSTALL_DIR/uninstall.sh with content:"
    echo "$UNINSTALL_CONTENT"
else
    echo "$UNINSTALL_CONTENT" | $SUDO tee "$INSTALL_DIR/uninstall.sh" >/dev/null
    $SUDO chmod +x "$INSTALL_DIR/uninstall.sh"
    status "Uninstall script created at $INSTALL_DIR/uninstall.sh"
fi