This guide will walk you through the steps to locally deploy **Sight AI Miner** and **Open WebUI** for seamless AI chat experience and real-time mining dashboard.

---

## ✅ Prerequisites

### 1. Install Docker

Download and install Docker for your system:

🔗 [https://www.docker.com](https://www.docker.com/)

Make sure Docker is running after installation.

### 2. Install Ollama

Download and install Ollama for model inference:

🔗 [https://ollama.com](https://ollama.com/)

Follow the official instructions based on your OS (macOS, Windows, or Linux).

---

## 🚀 Setup Steps

### 1. Download the installer script

```bash
curl https://www.sightai.io/model/sight-miner-cli-local.sh -O

```

### 2. Fix script permission

```bash
chmod +x ./sight-miner-cli-local.sh

```

### 3. (M1/M2/M3 Mac only) Set Docker platform for compatibility

```bash
export DOCKER_DEFAULT_PLATFORM=linux/amd64

```

### 4. Run the script

```bash
./sight-miner-cli-local.sh

```

This script will:

- Pull the `deepscaler` model to your Ollama
- Start all necessary containers (Postgres, backend, frontend)
- Install and run Open WebUI (for chat)
- Set up and open both the dashboard and chat interfaces

---

## ✅ Access the Interfaces

Once setup is complete, your terminal will display:

```
Setup complete! You can access:
- Sight AI Miner at: http://localhost:3000
- Open WebUI at: http://localhost:8080

```

### 🔹 `http://localhost:3000` – Sight AI Miner Dashboard

View your node’s activity, request logs, and reward earnings.

### 🔹 `http://localhost:8080` – Open WebUI

A web-based AI chat interface where users can talk with models like `deepscaler`.

---

## 💬 Using Open WebUI

1. Go to [http://localhost:8080](http://localhost:8080/)
2. Register a new account and log in
3. Choose an available model (e.g., `deepscaler`) to start chatting

> If no models appear, ensure your ollama list includes at least one model, and that Ollama is running.
> 

---

## 📊 Dashboard Monitoring

While using Open WebUI, go to [http://localhost:3000](http://localhost:3000/) to:

- See real-time user requests
- Check response details
- Track your computing contributions and reward generation

---

## 🧩 Need Help?

If you encounter issues:

- Make sure Docker is up and running
- Confirm that Ollama is working by running:
    
    ```bash
    ollama list
    ```
    
- Retry the script after restarting Docker if needed
