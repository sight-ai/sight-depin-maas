#!/bin/bash

SCRIPT_VERSION="1.0.0"

# Configuration file path
# CONFIG_FILE="config.conf"

# Default configuration
REGISTER_URL="http://localhost:8716/api/v1/device-status/register"

# Check if Ollama service is running
check_ollama_service() {
  # Check if Ollama service is running
  if ! curl -s http://localhost:11434/api/version &> /dev/null; then
    echo "Error: Ollama service is not running. Please start Ollama service first."
    echo "You can start it by running: ollama serve"
    exit 1
  fi
}

# Pull deepscaler model if Ollama is running
pull_deepseek_model() {
  echo "Pulling deepscaler model..."
  if ollama pull deepscaler; then
    echo "Successfully pulled deepscaler model"
  else
    echo "Failed to pull deepscaler model"
    exit 1
  fi
}

# # Load configuration file
# load_config() {
#   if [ -f "$CONFIG_FILE" ]; then
#     source "$CONFIG_FILE"
#   fi
# }

# Show help information
show_help() {
  cat <<EOF
Usage: $0 [options]

Options:
  run
    --gateway-url=<URL>       GATEWAY API URL
    --node-code=<CODE>        Node code
    --gateway-api-key=<KEY>   GATEWAY API Key
    --reward-address=<ADDR>   Reward address
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

# Function to open URL in default browser
open_browser() {
  local url=$1
  case "$(uname -s)" in
    Linux*)
      if command -v xdg-open > /dev/null; then
        xdg-open "$url" > /dev/null 2>&1
      elif command -v wslview > /dev/null; then
        wslview "$url" > /dev/null 2>&1
      fi
      ;;
    Darwin*)  open "$url" ;;
    CYGWIN*|MINGW*|MSYS*) cmd.exe /c start "$url" ;;
  esac
}

# Main execution function
run() {
  # Check Ollama service first
  check_ollama_service
  # Pull deepseek model
  pull_deepseek_model

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

  #  Download docker-compose.yml file
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

  # Create JSON data with proper variable expansion
  JSON_DATA=$(cat <<EOF
{
  "code": "$NODE_CODE",
  "gateway_address": "$GATEWAY_API_URL",
  "reward_address": "$REWARD_ADDRESS",
  "key": "$GATEWAY_API_KEY",
  "device_type": "$os",
  "gpu_type": "$GPU_MODEL"
}
EOF
)

  echo "Sending registration data: $JSON_DATA"

  # Make the API call and capture both response code and response body
  RESPONSE=$(curl -s -X POST "$REGISTER_URL" \
    -H "Content-Type: application/json" \
    -d "$JSON_DATA" \
    -w "\n%{http_code}")

  # Extract the response body and status code
  RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)
  STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)

  echo "Response body: $RESPONSE_BODY"
  echo "Status code: $STATUS_CODE"

  if [ "$STATUS_CODE" -eq 200 ]; then
    echo "API call successful, status code: $STATUS_CODE"
    sleep 5
    
    # Install and start Open WebUI
    echo "Installing Open WebUI..."
    if docker ps -a | grep -q open-webui; then
      echo "Removing existing Open WebUI container..."
      docker rm -f open-webui
    fi

    echo "Starting Open WebUI..."
    if docker run -d \
      -p 8080:8080 \
      -e OLLAMA_BASE_URL=$GATEWAY_API_URL \
      --add-host=host.docker.internal:host-gateway \
      -v ollama:/root/.ollama \
      -v open-webui:/app/backend/data \
      --name open-webui \
      --restart always \
      ghcr.io/open-webui/open-webui:ollama; then
      echo "Open WebUI started successfully"
    else
      echo "Failed to start Open WebUI"
      exit 1
    fi

    # Wait for services to start
    echo "Waiting for services to start..."
    sleep 5

    # Open browsers
    echo "Opening web interfaces..."
    open_browser "http://localhost:3000"
    sleep 2
    open_browser "http://localhost:8080"

    echo "Setup complete! You can access:"
    echo "- Sight AI Miner at: http://localhost:3000"
    echo "- Open WebUI at: http://localhost:8080"
  else
    echo "API call failed, status code: $STATUS_CODE"
    exit 1
  fi
}

# Main script execution
if [ "$1" = "run" ]; then
  shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --gateway-url=*)
        GATEWAY_API_URL="${1#*=}"
        shift
        ;;
      --node-code=*)
        NODE_CODE="${1#*=}"
        shift
        ;;
      --gateway-api-key=*)
        GATEWAY_API_KEY="${1#*=}"
        shift
        ;;
      --reward-address=*)
        REWARD_ADDRESS="${1#*=}"
        shift
        ;;
      --help)
        show_help
        exit 0
        ;;
      --version)
        show_version
        exit 0
        ;;
      *)
        echo "Unknown parameter: $1"
        show_help
        exit 1
        ;;
    esac
  done
  run
elif [ "$1" = "--help" ]; then
  show_help
elif [ "$1" = "--version" ]; then
  show_version
else
  echo "Error: Unknown command or parameters. Use --help to view usage."
  exit 1
fi

