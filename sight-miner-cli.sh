#!/bin/bash

# Script version and metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="Sight AI Miner CLI"
MIN_DOCKER_VERSION="20.10.0"
MIN_DOCKER_COMPOSE_VERSION="2.0.0"

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Logging configuration
LOG_FILE="/var/log/sight-miner/sight-miner.log"
LOG_DIR="/var/log/sight-miner"

# Ensure log directory exists
[[ ! -d "$LOG_DIR" ]] && sudo mkdir -p "$LOG_DIR"

# Logging functions
log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | sudo tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
    log "INFO" "$*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
    log "SUCCESS" "$*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
    log "WARNING" "$*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
    log "ERROR" "$*"
    return 1
}

# Progress spinner
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while ps -p $pid > /dev/null; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Version comparison function
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."

    # Check Docker version
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        return 1
    fi

    local docker_version=$(docker --version | cut -d ' ' -f3 | tr -d ',')
    if version_gt $MIN_DOCKER_VERSION $docker_version; then
        log_error "Docker version $docker_version is too old. Minimum required version is $MIN_DOCKER_VERSION"
        return 1
    fi

    # Check Docker Compose version
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        return 1
    fi

    local compose_version=$(docker-compose --version | cut -d ' ' -f3 | tr -d ',')
    if version_gt $MIN_DOCKER_COMPOSE_VERSION $compose_version; then
        log_error "Docker Compose version $compose_version is too old. Minimum required version is $MIN_DOCKER_COMPOSE_VERSION"
        return 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker service first."
        return 1
    fi

    log_success "System requirements check passed"
    return 0
}

# Show help information with colors
show_help() {
    cat <<EOF
${BOLD}${SCRIPT_NAME} v${SCRIPT_VERSION}${NC}

${BOLD}Usage:${NC}
    $0 [command] [options]

${BOLD}Commands:${NC}
    run                     Run the miner
    status                  Check miner status
    stop                    Stop the miner
    logs                    View miner logs
    update                  Update the miner to latest version

${BOLD}Options:${NC}
    --mode=local           Run in local mode
    --mode=remote          Run in remote mode with following parameters:
      --gateway-url=URL     Gateway API URL
      --node-code=CODE      Node code
      --gateway-api-key=KEY Gateway API key
      --reward-address=ADDR Reward address
    
    --help                 Show this help information
    --version              Show script version

${BOLD}Examples:${NC}
    $0 run --mode=local
    $0 run --mode=remote --gateway-url=https://example.com --node-code=ABC123

${BOLD}For more information, visit:${NC} https://sightai.io/docs
EOF
    exit 0
}

# Show script version with style
show_version() {
    echo -e "${BOLD}${SCRIPT_NAME} v${SCRIPT_VERSION}${NC}"
    exit 0
}

# Function to select run mode with better UI
select_mode() {
    echo -e "\n${BOLD}Please select run mode:${NC}"
    echo -e "${BLUE}1)${NC} Local mode  ${YELLOW}(run locally without parameters)${NC}"
    echo -e "${BLUE}2)${NC} Remote mode ${YELLOW}(requires gateway URL and other parameters)${NC}"
    
    while true; do
        read -p "Enter your choice (1 or 2): " choice
        case $choice in
            1)
                MODE="local"
                break
                ;;
            2)
                MODE="remote"
                echo -e "\n${BOLD}Please enter remote mode parameters:${NC}"
                read -p "Gateway URL: " GATEWAY_API_URL
                read -p "Node code: " NODE_CODE
                read -p "Gateway API key: " GATEWAY_API_KEY
                read -p "Reward address: " REWARD_ADDRESS
                
                # Validate input
                if [[ -z "$GATEWAY_API_URL" || -z "$NODE_CODE" || -z "$GATEWAY_API_KEY" || -z "$REWARD_ADDRESS" ]]; then
                    log_error "All parameters are required for remote mode"
                    exit 1
                fi
                break
                ;;
            *)
                log_error "Invalid choice. Please select 1 or 2"
                ;;
        esac
    done
}

# Check if Ollama service is running
check_ollama_service() {
    log_info "Checking Ollama service..."
    if ! curl -s http://localhost:11434/api/version &> /dev/null; then
        log_error "Ollama service is not running. Please start Ollama service first."
        log_info "You can start it by running: ollama serve"
        return 1
    fi
    log_success "Ollama service is running"
    return 0
}

# Pull deepscaler model with progress indication
pull_deepseek_model() {
    log_info "Pulling deepscaler model..."
    ollama pull deepscaler &
    spinner $!
    
    if [ $? -eq 0 ]; then
        log_success "Successfully pulled deepscaler model"
        return 0
    else
        log_error "Failed to pull deepscaler model"
        return 1
    fi
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

# Enhanced GPU detection with better error handling
get_gpu_info() {
    local os=$(get_os)
    log_info "Detecting GPU on $os system..."
    
    case "$os" in
        Linux)
            if command -v powershell.exe &>/dev/null; then
                detect_gpu_windows
            else
                detect_gpu_linux
            fi
            ;;
        Darwin)
            detect_gpu_macos
            ;;
        Windows)
            detect_gpu_windows
            ;;
        *)
            log_warning "Unsupported operating system"
            GPU_BRAND="Unknown"
            GPU_MODEL="Unknown"
            ;;
    esac
    
    log_info "Detected GPU Brand: $GPU_BRAND"
    log_info "Detected GPU Model: $GPU_MODEL"
}

detect_gpu_linux() {
    if ! command -v lspci &>/dev/null; then
        log_warning "lspci not found, installing pciutils..."
        sudo apt-get update && sudo apt-get install -y pciutils
    fi
    
    local gpu_info=$(lspci | grep -iE 'VGA|3D controller')
    if [[ -z "$gpu_info" ]]; then
        log_warning "No GPU detected"
        GPU_BRAND="Unknown"
        GPU_MODEL="Unknown"
        return
    fi
    
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
}

detect_gpu_macos() {
    local gpu_info=$(system_profiler SPDisplaysDataType 2>/dev/null | grep -E 'Chipset Model|Model' | awk -F ': ' '{print $2}' | head -n 1)
    
    if [[ -z "$gpu_info" ]]; then
        log_warning "No GPU information available"
        GPU_BRAND="Unknown"
        GPU_MODEL="Unknown"
        return
    fi
    
    if [[ "$gpu_info" == *"Apple"* ]]; then
        GPU_BRAND="Apple Silicon"
        GPU_MODEL="$gpu_info"
    elif [[ "$gpu_info" == *"AMD"* ]]; then
        GPU_BRAND="AMD"
        GPU_MODEL="$gpu_info"
    elif [[ "$gpu_info" == *"Intel"* ]]; then
        GPU_BRAND="Intel"
        GPU_MODEL="$gpu_info"
    else
        GPU_BRAND="Unknown"
        GPU_MODEL="$gpu_info"
    fi
}

detect_gpu_windows() {
    local gpu_info=$(powershell.exe -Command "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Caption" | tr -d '\r')
    
    if [[ -z "$gpu_info" ]]; then
        log_warning "No GPU information available"
        GPU_BRAND="Unknown"
        GPU_MODEL="Unknown"
        return
    fi
    
    if echo "$gpu_info" | grep -iq 'NVIDIA'; then
        GPU_BRAND="NVIDIA"
        GPU_MODEL=$(echo "$gpu_info" | grep -i 'NVIDIA' | head -n 1)
    elif echo "$gpu_info" | grep -iq 'AMD'; then
        GPU_BRAND="AMD"
        GPU_MODEL=$(echo "$gpu_info" | grep -i 'AMD' | head -n 1)
    elif echo "$gpu_info" | grep -iq 'Intel'; then
        GPU_BRAND="Intel"
        GPU_MODEL=$(echo "$gpu_info" | grep -i 'Intel' | head -n 1)
    else
        GPU_BRAND="Unknown"
        GPU_MODEL="$gpu_info"
    fi
}

# Function to open URL in default browser
open_browser() {
    local url=$1
    log_info "Opening $url in default browser..."
    
    case "$(uname -s)" in
        Linux*)
            if command -v xdg-open > /dev/null; then
                xdg-open "$url" > /dev/null 2>&1
            elif command -v wslview > /dev/null; then
                wslview "$url" > /dev/null 2>&1
            else
                log_warning "Could not detect a suitable browser opener"
            fi
            ;;
        Darwin*)
            open "$url"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            cmd.exe /c start "$url"
            ;;
    esac
}

# Enhanced local mode execution
run_local() {
    log_info "Starting local mode setup..."
    
    # Download docker-compose.yml file
    local DOCKER_COMPOSE_URL="https://sightai.io/model/local/docker-compose.yml"
    local DOCKER_COMPOSE_FILE="docker-compose.yml"

    log_info "Downloading $DOCKER_COMPOSE_FILE..."
    if curl -fsSL -o "$DOCKER_COMPOSE_FILE" "$DOCKER_COMPOSE_URL"; then
        log_success "$DOCKER_COMPOSE_FILE downloaded successfully"
    else
        log_error "Failed to download $DOCKER_COMPOSE_FILE"
        return 1
    fi

    # Create docker-compose.override.yml file
    create_override_file "local"
    
    start_services
}

# Enhanced remote mode execution
run_remote() {
    log_info "Starting remote mode setup..."
    
    # Validate remote mode parameters
    if [[ -z "$GATEWAY_API_URL" || -z "$NODE_CODE" || -z "$GATEWAY_API_KEY" || -z "$REWARD_ADDRESS" ]]; then
        log_error "Missing required parameters for remote mode"
        return 1
    fi

    # Download docker-compose.yml file
    local DOCKER_COMPOSE_URL="https://sightai.io/model/local/docker-compose.yml"
    local DOCKER_COMPOSE_FILE="docker-compose.yml"

    log_info "Downloading $DOCKER_COMPOSE_FILE..."
    if curl -fsSL -o "$DOCKER_COMPOSE_FILE" "$DOCKER_COMPOSE_URL"; then
        log_success "$DOCKER_COMPOSE_FILE downloaded successfully"
    else
        log_error "Failed to download $DOCKER_COMPOSE_FILE"
        return 1
    fi

    # Create docker-compose.override.yml file
    create_override_file "remote"
    
    if ! start_services; then
        return 1
    fi

    # Register device
    register_device
}

# Create override file based on mode
create_override_file() {
    local mode=$1
    local OVERRIDE_FILE="docker-compose.override.yml"
    
    log_info "Creating $OVERRIDE_FILE for $mode mode..."
    
    if [ "$mode" = "local" ]; then
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
    else
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
    fi
    
    log_success "Created $OVERRIDE_FILE successfully"
}

# Start services with enhanced error handling
start_services() {
    log_info "Starting services..."
    
    # Start docker-compose
    log_info "Starting docker-compose..."
    if ! docker-compose up --build -d; then
        log_error "Failed to start docker-compose"
        return 1
    fi
    log_success "Docker compose services started successfully"

    # Start Open WebUI
    log_info "Setting up Open WebUI..."
    if docker ps -a | grep -q open-webui; then
        log_info "Removing existing Open WebUI container..."
        docker rm -f open-webui
    fi

    log_info "Starting Open WebUI..."
    if ! docker run -d \
        -p 8080:8080 \
        -e OLLAMA_BASE_URL="$([ "$MODE" = "remote" ] && echo "$GATEWAY_API_URL" || echo "http://host.docker.internal:8716")" \
        --add-host=host.docker.internal:host-gateway \
        -v ollama:/root/.ollama \
        -v open-webui:/app/backend/data \
        --name open-webui \
        --restart always \
        ghcr.io/open-webui/open-webui:ollama; then
        log_error "Failed to start Open WebUI"
        return 1
    fi
    log_success "Open WebUI started successfully"

    # Wait for services to start
    log_info "Waiting for services to initialize..."
    sleep 5

    # Open web interfaces
    log_info "Opening web interfaces..."
    open_browser "http://localhost:3000"
    sleep 2
    open_browser "http://localhost:8080"

    log_success "All services started successfully"
    
    # Print prominent success message with port information
    echo -e "\n${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║                   Setup Complete! 🎉                        ║${NC}"
    echo -e "${BOLD}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}║  Services are now running on:                              ║${NC}"
    echo -e "${BOLD}║                                                            ║${NC}"
    echo -e "${BOLD}║  📊 Sight AI Miner Dashboard:                              ║${NC}"
    echo -e "${BOLD}║     ${GREEN}http://localhost:3000${NC}                              ${BOLD}║${NC}"
    echo -e "${BOLD}║                                                            ║${NC}"
    echo -e "${BOLD}║  🌐 Open WebUI Interface:                                  ║${NC}"
    echo -e "${BOLD}║     ${GREEN}http://localhost:8080${NC}                              ${BOLD}║${NC}"
    echo -e "${BOLD}║                                                            ║${NC}"
    echo -e "${BOLD}║  Both services should open automatically in your browser.  ║${NC}"
    echo -e "${BOLD}║  If not, you can click or copy the URLs above.            ║${NC}"
    echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    
    return 0
}

# Register device with the server
register_device() {
    local REGISTER_URL="http://localhost:8716/api/v1/device-status/register"
    log_info "Registering device with server..."
    
    # Create JSON data
    local JSON_DATA=$(cat <<EOF
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

    log_info "Sending registration data..."
    local RESPONSE=$(curl -s -X POST "$REGISTER_URL" \
        -H "Content-Type: application/json" \
        -d "$JSON_DATA" \
        -w "\n%{http_code}")

    local RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)
    local STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)

    if [ "$STATUS_CODE" -eq 200 ]; then
        log_success "Device registered successfully"
        return 0
    else
        log_error "Failed to register device (Status code: $STATUS_CODE)"
        log_error "Response: $RESPONSE_BODY"
        return 1
    fi
}

# Main execution function
run() {
    # Print banner
    echo -e "${BOLD}${BLUE}
    ╔═══════════════════════════════════════╗
    ║           Sight AI Miner CLI          ║
    ║              v${SCRIPT_VERSION}                 ║
    ╚═══════════════════════════════════════╝${NC}"

    # Check system requirements
    if ! check_requirements; then
        return 1
    fi

    # Check Ollama service
    if ! check_ollama_service; then
        return 1
    fi

    # Pull deepseek model
    if ! pull_deepseek_model; then
        return 1
    fi

    log_info "Detecting system information..."
    get_gpu_info
    local os=$(get_os)
    GPU_MODEL=$(echo "$GPU_MODEL" | sed ':a;N;$!ba;s/\n/ /g')

    # Run according to selected mode
    case "$MODE" in
        "local")
            run_local
            ;;
        "remote")
            run_remote
            ;;
        *)
            log_error "Invalid mode selected"
            return 1
            ;;
    esac
}

# Command processing
case "$1" in
    "run")
        shift
        while [ $# -gt 0 ]; do
            case "$1" in
                --mode=*)
                    MODE="${1#*=}"
                    shift
                    ;;
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
                *)
                    log_error "Unknown parameter: $1"
                    show_help
                    exit 1
                    ;;
            esac
        done
        
        # If mode not specified, show interactive menu
        if [ -z "$MODE" ]; then
            select_mode
        fi
        
        run
        ;;
    "status")
        check_miner_status
        ;;
    "stop")
        stop_miner
        ;;
    "logs")
        show_logs
        ;;
    "update")
        update_miner
        ;;
    "--help")
        show_help
        ;;
    "--version")
        show_version
        ;;
    *)
        log_error "Unknown command. Use --help to view usage."
        exit 1
        ;;
esac

