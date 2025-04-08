#!/bin/bash

SCRIPT_VERSION="1.0.0"

# Configuration file path
# CONFIG_FILE="config.conf"

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
  run                      Run the miner directly
  --help                   Show this help information
  --version                Show script version
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
  # pull_deepseek_model

  echo "Starting Sight AI Miner..."

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
      - NODE_CODE=default
      - GATEWAY_API_URL=https://sightai.io
      - GATEWAY_API_KEY=default
      - REWARD_ADDRESS=default
      - GPU_BRAND="${GPU_BRAND}"
      - DEVICE_TYPE="${os}"
      - GPU_MODEL="${GPU_MODEL}"
EOL

  echo "-------------------- Generated $OVERRIDE_FILE --------------------"
  cat "$OVERRIDE_FILE"
  echo "----------------------------------------------------------"

  # Start docker-compose
  echo "Starting docker-compose..."
  if docker-compose up --build -d; then
    echo "docker-compose container started successfully."
  else
    echo "Failed to run docker-compose."
    exit 1
  fi

  # Install and start Open WebUI
  echo "Installing Open WebUI..."
  if docker ps -a | grep -q open-webui; then
    echo "Removing existing Open WebUI container..."
    docker rm -f open-webui
  fi


  echo "Starting Open WebUI..."
  if  docker run -d \
  -p 8080:8080 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:8716 \
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
}

# Main script execution
if [ "$1" = "run" ] || [ -z "$1" ]; then
  run
elif [ "$1" = "--help" ]; then
  show_help
elif [ "$1" = "--version" ]; then
  show_version
else
  echo "Error: Unknown command. Use --help to view usage."
  exit 1
fi

