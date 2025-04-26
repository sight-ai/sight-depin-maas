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
