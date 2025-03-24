#!/bin/bash

SCRIPT_VERSION="1.0.0"

# 配置文件路径
CONFIG_FILE="config.conf"

# 默认配置
REGISTER_URL="http://localhost:8716/api/v1/device-status/register"

# 加载配置文件
load_config() {
  if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
  fi
}

# 显示帮助信息
show_help() {
  cat <<EOF
用法: $0 [选项]

选项:
  run
    --gateway-url=<URL>       GATEWAY API 地址
    --node-code=<CODE>        节点代码
    --gateway-api-key=<KEY>   GATEWAY API 密钥
    --openai-api-key=<KEY>    OpenAI API 密钥
    --openpipe-api-key=<KEY>  OpenPipe API 密钥
    --private-key=<KEY>       私钥
  --register-url=<URL>      注册设备状态的 URL (默认为 $REGISTER_URL)
  --help                    显示此帮助信息
  --version                 显示脚本版本
EOF
  exit 0
}

# 显示版本信息
show_version() {
  echo "脚本版本: $SCRIPT_VERSION"
  exit 0
}

# 获取操作系统类型
get_os() {
  case "$(uname -s)" in
    Linux*) echo "Linux" ;;
    Darwin*) echo "macOS" ;;
    CYGWIN*|MINGW*|MSYS*) echo "Windows" ;;
    *) echo "Unknown" ;;
  esac
}
# 获取显卡信息
get_gpu_info() {
  os=$(get_os)
  echo $os ;
  case "$os" in
    Linux)
      echo "Running lspci to detect GPU..."
      if command -v powershell.exe &>/dev/null; then
        gpu_info=$(powershell.exe -Command "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Caption" | tr -d '\r')
        echo "GPU info from powershell: $gpu_info"

        # 尝试获取独立显卡
        if echo "$gpu_info" | grep -iq 'NVIDIA'; then
          GPU_BRAND="NVIDIA"
          GPU_MODEL=$(echo "$gpu_info" | grep -i 'NVIDIA' | head -n 1)
        elif echo "$gpu_info" | grep -iq 'AMD'; then
          GPU_BRAND="AMD"
          GPU_MODEL=$(echo "$gpu_info" | grep -i 'AMD' | head -n 1)
        else
          # 如果没有独立显卡，则获取集成显卡
          if echo "$gpu_info" | grep -iq 'Intel'; then
            GPU_BRAND="Intel"
            GPU_MODEL=$(echo "$gpu_info" | grep -i 'Intel' | head -n 1)
          else
            GPU_BRAND="Unknown"
            GPU_MODEL="Unknown"
          fi
        fi
      else
        gpu_info=$(lspci | grep -iE 'VGA|3D controller')
        echo "lspci output: $gpu_info"
        if echo "$gpu_info" | grep -iq 'NVIDIA'; then
          GPU_BRAND="NVIDIA"
          GPU_MODEL=$(echo "$gpu_info" | grep -i 'NVIDIA' | sed -E 's/.*: (.*)/\1/')
        elif echo "$gpu_info" | grep -iq 'AMD'; then
          GPU_BRAND="AMD"
          GPU_MODEL=$(echo "$gpu_info" | grep -i 'AMD' | sed -E 's/.*: (.*)/\1/')
        elif echo "$gpu_info" | grep -iq 'Intel'; then
          GPU_BRAND="Intel"
          GPU_MODEL=$(echo "$gpu_info" | grep -i 'Intel' | sed -E 's/.*: (.*)/\1/')
        else
          GPU_BRAND="Unknown"
          GPU_MODEL="Unknown"
        fi
      fi
      ;;
    Darwin)
      gpu_info=$(system_profiler SPDisplaysDataType 2>/dev/null | grep -E 'Chipset Model|Model' | awk -F ': ' '{print $2}' | head -n 1)
      echo "GPU info from system_profiler: $gpu_info"
      if [[ "$gpu_info" == *"Apple"* ]]; then
        GPU_BRAND="Apple M系列"
        GPU_MODEL="$gpu_info"
      elif [[ "$gpu_info" == *"AMD"* ]]; then
        GPU_BRAND="AMD"
        GPU_MODEL="$gpu_info"
      elif [[ "$gpu_info" == *"Intel"* ]]; then
        GPU_BRAND="Intel"
        GPU_MODEL="$gpu_info"
      else
        GPU_BRAND="Unknown"
        GPU_MODEL="Unknown"
      fi
      ;;
    CYGWIN*|MINGW*|MSYS*)
      if command -v powershell &>/dev/null; then
        gpu_info=$(powershell -Command "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Caption" | tr -d '\r')
        echo "GPU info from powershell: $gpu_info"
        # 尝试获取独立显卡
        if echo "$gpu_info" | grep -iq 'NVIDIA'; then
          GPU_BRAND="NVIDIA"
          GPU_MODEL=$(echo "$gpu_info" | grep -i 'NVIDIA' | head -n 1)
        elif echo "$gpu_info" | grep -iq 'AMD'; then
          GPU_BRAND="AMD"
          GPU_MODEL=$(echo "$gpu_info" | grep -i 'AMD' | head -n 1)
        else
          # 如果没有独立显卡，则获取集成显卡
          if echo "$gpu_info" | grep -iq 'Intel'; then
            GPU_BRAND="Intel"
            GPU_MODEL=$(echo "$gpu_info" | grep -i 'Intel' | head -n 1)
          else
            GPU_BRAND="Unknown"
            GPU_MODEL="Unknown"
          fi
        fi
      else
        GPU_BRAND="Unknown"
        GPU_MODEL="Unknown"
      fi
      ;;
    *)
      GPU_BRAND="Unknown"
      GPU_MODEL="Unknown"
      ;;
  esac
}

# 主执行函数
run() {
  echo "GATEWAY_API_URL: $GATEWAY_API_URL"
  echo "NODE_CODE: $NODE_CODE"
  echo "GATEWAY_API_KEY: $GATEWAY_API_KEY"
  echo "OPENAI_API_KEY: $OPENAI_API_KEY"
  echo "OPENPIPE_API_KEY: $OPENPIPE_API_KEY"
  echo "PRIVATE_KEY: $PRIVATE_KEY"

  # 检查必要的参数是否提供
  if [ -z "$GATEWAY_API_URL" ] || [ -z "$NODE_CODE" ] || [ -z "$GATEWAY_API_KEY" ] || [ -z "$OPENAI_API_KEY" ] || [ -z "$OPENPIPE_API_KEY" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "错误: 缺少必要参数。使用 --help 查看用法。"
    exit 1
  fi
  # 输出检测到的显卡信息
  echo "检测设备显卡品牌..."
  get_gpu_info
  echo "检测到的显卡品牌: $GPU_BRAND"
  echo "检测到的显卡型号: $GPU_MODEL"

  # 获取操作系统类型
  os=$(get_os)
  echo "操作系统类型: $os"

  # 替换 GPU_MODEL 中的换行符
  GPU_MODEL=$(echo "$GPU_MODEL" | sed ':a;N;$!ba;s/\n/ /g')

  # # 下载 docker-compose.yml 文件
  # DOCKER_COMPOSE_URL="https://raw.githubusercontent.com/sight-ai/saito-miner/refs/heads/main/docker-compose.yml?token=GHSAT0AAAAAADAJYQIOVCGT4EHG3IXMVGFMZ7BN2WA"
  # DOCKER_COMPOSE_FILE="docker-compose.yml"

  # echo "下载 $DOCKER_COMPOSE_FILE..."
  # if curl -fsSL -o "$DOCKER_COMPOSE_FILE" "$DOCKER_COMPOSE_URL"; then
    echo "$DOCKER_COMPOSE_FILE 下载成功。"
  # else
  #   echo "下载 $DOCKER_COMPOSE_FILE 失败，请检查网络连接。"
  #   exit 1
  # fi

  sleep 2

  # 创建 docker-compose.override.yml 文件
  OVERRIDE_FILE="docker-compose.override.yml"

  echo "创建 $OVERRIDE_FILE 文件..."
  cat > "$OVERRIDE_FILE" <<EOL
version: '3'
services:
  sight-miner-backend:
    environment:
      - NODE_CODE=${NODE_CODE}
      - GATEWAY_API_URL=${GATEWAY_API_URL}
      - GATEWAY_API_KEY=${GATEWAY_API_KEY}
      - GPU_BRAND="${GPU_BRAND}"
      - DEVICE_TYPE="${os}"
      - GPU_MODEL="${GPU_MODEL}"
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENPIPE_API_KEY=${OPENPIPE_API_KEY}
      - PRIVATE_KEY=${PRIVATE_KEY}
EOL

  echo "-------------------- 生成的 $OVERRIDE_FILE --------------------"
  cat "$OVERRIDE_FILE"
  echo "----------------------------------------------------------"

  # 启动 docker-compose
  echo "启动 docker-compose..."
  if docker-compose up -d; then
    echo "docker-compose 容器已启动。"
  else
    echo "运行 docker-compose 失败。"
    exit 1
  fi

  echo "等待 10 秒，确保容器服务启动..."
  sleep 10

  # 注册设备状态
  echo "调用接口: $REGISTER_URL"

  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$REGISTER_URL")
  if [ "$RESPONSE" -eq 200 ]; then
    echo "接口调用成功，状态码: $RESPONSE"
    sleep 5
    echo "请打开链接: http://localhost:3000/"
  else
    echo "接口调用失败，状态码: $RESPONSE"
    exit 1
  fi
}

# 解析命令行参数
# 加载配置文件
load_config

if [ "$1" == "run" ]; then
  shift  # 去掉第一个参数 'run'
  # 解析参数
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --gateway-url=*)        GATEWAY_API_URL="${1#*=}" ;;
      --node-code=*)          NODE_CODE="${1#*=}" ;;
      --gateway-api-key=*)    GATEWAY_API_KEY="${1#*=}" ;;
      --openai-api-key=*)     OPENAI_API_KEY="${1#*=}" ;;
      --openpipe-api-key=*)   OPENPIPE_API_KEY="${1#*=}" ;;
      --private-key=*)        PRIVATE_KEY="${1#*=}" ;;
      --register-url=*)       REGISTER_URL="${1#*=}" ;;
      --help)                 show_help; exit 0 ;;
      --version)              show_version; exit 0 ;;
      *)                      echo "未知参数: $1"; show_help; exit 1 ;;
    esac
    shift
  done

  # 调用 run 函数
  run
  exit 0
fi

# 默认的参数解析逻辑
echo "错误: 未知命令或参数。使用 --help 查看用法。"
