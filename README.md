This guide walks through steps to deploy **Sight Compute Node** on local devices, set up the real-time dashboard, and [optionally] chat via **Open WebUI** with the backend.

---

## ✅ Prerequisites

### 1. Install Docker

🔗  [https://www.docker.com](https://www.docker.com/) 

Make sure Docker is running after installation.



### 2. Install Ollama

🔗  [https://ollama.com](https://ollama.com/)

Make sure both Docker and Ollama are installed and running before continuing.
---

## 🚀 Setup Steps

### Run the setup script

```bash
curl -s https://www.sightai.io/model/sight-miner-cli-local.sh | bash
```


This single command will:

- ✅ Automatically pull the **`deepscaler`** model into your local **Ollama**
- 🐳 Start all necessary Docker containers:
  - Postgres
  - Backend
  - Frontend
- 💬 Install and run **Open WebUI** (chat interface)
- 📊 Launch the **Sight AI Miner Dashboard** (analytics/monitoring)

---

### ✅ After setup completes

You’ll see this output at the end:

```
Setup complete! You can access:
- Sight AI Miner at: http://localhost:3000
- Open WebUI at: http://localhost:8080
```

- Go to `http://localhost:8080` to start chatting with models like `deepscaler`
- Go to `http://localhost:3000` to monitor miner activity and earnings in real time

---

### 🔹 Sight Compute Node Dashboard
[http://localhost:3000](http://localhost:3000).
View your node’s activity, request logs, and reward earnings.

### 🔹 Open WebUI
[http://localhost:8080](http://localhost:8080).
A web-based AI chat interface where users can talk with models like `deepscaler`.

---

## 💬 Chat via Open WebUI

1. Go to [http://localhost:8080](http://localhost:8080/)
2. Register a new account and log in
3. Choose an available model (e.g., `deepscaler`) to start chatting

> If no models appear, ensure your ollama list includes at least one model, and that Ollama is running.
> 

---

## 📊 Dashboard

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
