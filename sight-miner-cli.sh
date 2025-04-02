#!/bin/bash

SCRIPT_VERSION="1.0.0"

# Configuration file path
CONFIG_FILE="config.conf"

# Default configuration
REGISTER_URL="http://localhost:8716/api/v1/device-status/register"

# Load configuration file
load_config() {
  if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
  fi
}

# Show help information
show_help() {
  cat <<EOF
Usage: $0 [options]

Options:
  run
    --gateway-url=<URL>       GATEWAY API URL
    --node-code=<CODE>        Node code
    --gateway-api-key=<KEY>   GATEWAY API Key
  --help                    Show this help information
  --version                 Show script version
EOF
  exit 0
}

# Show script version
show_version() {
  echo "Script version: $SCRIPT_VERSION"
  exit 0
}

# Get operating system type
get_os() {
  case "$(uname -s)" in
    Linux*) echo "Linux" ;;
    Darwin*) echo "macOS" ;;
    CYGWIN*|MINGW*|MSYS*) echo "Windows" ;;
    *) echo "Unknown" ;;
  esac
}
# Get GPU information
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

# Main execution function
run() {
  echo "GATEWAY_API_URL: $GATEWAY_API_URL"
  echo "NODE_CODE: $NODE_CODE"
  echo "GATEWAY_API_KEY: $GATEWAY_API_KEY"
  echo "REWARD_ADDRESS: $REWARD_ADDRESS"

  # Check if necessary parameters are provided
  if [ -z "$GATEWAY_API_URL" ] || [ -z "$NODE_CODE" ] || [ -z "$GATEWAY_API_KEY" ] || [ -z "$REWARD_ADDRESS" ]; then
    echo "Error: Missing required parameters. Use --help to view usage."
    exit 1
  fi
  # Output detected GPU information
  echo "Detecting device GPU brand..."
  get_gpu_info
  echo "Detected GPU brand: $GPU_BRAND"
  echo "Detected GPU model: $GPU_MODEL"

  # Get operating system type
  os=$(get_os)
  echo "Operating system type: $os"

  # Replace newline characters in GPU_MODEL
  GPU_MODEL=$(echo "$GPU_MODEL" | sed ':a;N;$!ba;s/\n/ /g')

   # Download docker-compose.yml file
   DOCKER_COMPOSE_URL="https://sightai.io/model/local/docker-compose.yml"
   DOCKER_COMPOSE_FILE="docker-compose.yml"

   echo "Downloading $DOCKER_COMPOSE_FILE..."
   if curl -fsSL -o "$DOCKER_COMPOSE_FILE" "$DOCKER_COMPOSE_URL"; then
    echo "$DOCKER_COMPOSE_FILE downloaded successfully."
   else
     echo "Failed to download $DOCKER_COMPOSE_FILE, please check network connection."
     exit 1
   fi

  sleep 2

  # Create docker-compose.override.yml file
  OVERRIDE_FILE="docker-compose.override.yml"

  echo "Creating $OVERRIDE_FILE file..."
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
      - REWARD_ADDRESS=${REWARD_ADDRESS}
EOL

  echo "-------------------- Generated $OVERRIDE_FILE --------------------"
  cat "$OVERRIDE_FILE"
  echo "----------------------------------------------------------"

  # Start docker-compose
  echo "Starting docker-compose..."
  if docker-compose up --build -d; then
    echo "docker-compose container started."
  else
    echo "Failed to run docker-compose."
    exit 1
  fi

  echo "Waiting 10 seconds to ensure container service starts..."
  sleep 10

  # Register device status
  echo "Calling API: $REGISTER_URL"

  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$REGISTER_URL")
  if [ "$RESPONSE" -eq 200 ]; then
    echo "API call successful, status code: $RESPONSE"
    sleep 5
    echo "Please open link: http://localhost:3000/"
  else
    echo "API call failed, status code: $RESPONSE"
    exit 1
  fi
}

# Parse command line arguments
# Load configuration file
load_config

if [ "$1" == "run" ]; then
  shift  # Remove the first argument 'run'
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --gateway-url=*)        GATEWAY_API_URL="${1#*=}" ;;
      --node-code=*)          NODE_CODE="${1#*=}" ;;
      --gateway-api-key=*)    GATEWAY_API_KEY="${1#*=}" ;;
      --reward-address=*)     REWARD_ADDRESS="${1#*=}" ;;
      --help)                 show_help; exit 0 ;;
      --version)              show_version; exit 0 ;;
      *)                      echo "Unknown parameter: $1"; show_help; exit 1 ;;
    esac
    shift
  done

  # Call the run function
  run
  exit 0
fi

# Default parameter parsing logic
echo "Error: Unknown command or parameters. Use --help to view usage."

