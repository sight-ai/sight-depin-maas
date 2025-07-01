# SightAI Miner

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/sightai/miner)
[![Docker](https://img.shields.io/badge/docker-supported-green.svg)](https://hub.docker.com/r/sightai/miner)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

## ✨ Introduction

Welcome to **Sight AI** — a decentralized AI compute network where anyone can turn idle hardware into productive AI infrastructure.

This guide will walk you through everything you need to:

- 🔧 **Deploy your own compute node locally**
- 💬 **Run a chat interface to interact with AI models**
- 🌐 **Connect to the Sight Gateway to process real user requests**
- 💰 **Earn rewards by contributing compute power**
- 🔁 *(Optional)* **Integrate with Dify for advanced AI workflows**

# ⚙️ Local Deployment

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

### **Run the setup script**

```
curl -s https://www.sightai.io/model/sight-miner-cli-local.sh | bash
```

This single command will:

- ✅ Automatically pull the **`deepscaler`** model into your local **Ollama**
- 🐳 Start all necessary Docker containers:
    - Postgres
    - Backend
    - Frontend
- 💬 Install and run **Open WebUI** (chat interface)
- 📊 Launch the **Sight AI Miner Dashboard** (analytics/monitoring)

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

## ✅ Local Deployment Complete!

Congratulations — your Sight AI node is now **successfully running locally**!

You’ve:

- Deployed a full compute stack with just one command
- Launched a live AI chat interface (Open WebUI)
- Accessed a powerful miner dashboard to track your compute and rewards

This local environment is ideal for development, testing, and exploring how decentralized AI works.

---

👉 **Next step: Connect your node to the Sight Gateway** to start processing real user requests and earning testnet rewards.

---

# 🌐 Connect Your Local Node to Sight Gateway

Once you've deployed Sight AI Miner locally, you can easily register your compute node with the **Sight Gateway**. This allows your node to start receiving **real AI request traffic** from real users.

---

### ✅ Click **“Connect to Gateway”**

From your local dashboard, click the **"Connect to Gateway"** button.

You will be redirected to:

👉 https://sightai.io/model/gateway

---

### ✅ Log in with Your Wallet

Click **“Connect Wallet”** in the top-right corner and sign the login message.

> This connects your node to your wallet identity and lets you receive rewards for processing tasks.
>

---

### ✅ Activate a New Device

Once logged in:

- Click the **“Activate New Device”** button
- A setup prompt will appear, showing a ready-to-run command like this:

![1](https://github.com/user-attachments/assets/e6d29f46-1854-434c-98bf-5dbb778502a3)


```bash
curl -s https://www.sightai.io/model/sight-miner-cli.sh | bash -s -- run --reward-address="0xe9fBEB62238E72d772A3cF06f64b343eFBeF30dd" --gateway-url="https://sightai.io/api/model" --node-code="xrjiio4w5" --gateway-api-key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIweGU5ZkJFQjYyMjM4RTcyZDc3MkEzY0YwNmY2NGIzNDNlRkJlRjMwZGQiLCJpc3MiOiJodHRwczovL3NpZ2h0YWkuaW8iLCJhdWQiOiJodHRwczovL3NpZ2h0YWkuaW8iLCJhZGRyZXNzIjoiMHhlOWZCRUI2MjIzOEU3MmQ3NzJBM2NGMDZmNjRiMzQzZUZCZUYzMGRkIiwiaWF0IjoxNzQ0NzgwMjM
5LCJleHAiOjE3NDczNzIyMzl9.VTgKyncL1sn2OT8XhlAf45NEvY28KYyueKuJhupFTdE"
```

---

### ✅ 4. Run the Setup Script in Terminal

Open your terminal and paste the command. Once setup is complete, your terminal will display:

```bash
Setup complete! You can access:
- Sight AI Miner at: http://localhost:3000
- Open WebUI at: http://localhost:8080
```

This script will:

- Pull the `deepscaler` model into **Ollama**
- Start required containers for:
    - Postgres
    - Backend
    - Frontend
- Launch:
    - **Sight AI Miner Dashboard**: `http://localhost:3000`
    - **Open WebUI (Chat Interface)**: `http://localhost:8080`
- Once the setup is complete, return to the Gateway interface and click **"I have completed all steps."** You will then be automatically redirected to the **Gateway Device** page, where you can view the status of currently connected devices.

![2](https://github.com/user-attachments/assets/4dbf6285-12e7-4b45-a343-1449b5df30e5)



> ✅ This setup is now connected to the Gateway, meaning all AI chat requests from users are distributed through the official Sight Gateway and assigned to your local node.
>

---

## 🧠 How Is This Different from Local-Only Mode?

| Feature | Local-Only Setup | Gateway-Connected Setup |
| --- | --- | --- |
| Task Source | Local Chat Only | Tasks from Real Users (via Gateway) |
| Rewards | Simulated or none | Earn **real testnet rewards** |
| Node Registration | Not required | Requires wallet login |
| Request Distribution | Only your own input | Gateway-managed distribution |

---

## 📊 Monitor Node Performance

After completing setup, visit:

- **Dashboard:** [http://localhost:3000](http://localhost:3000/)
- **WebUI Chat:** [http://localhost:8080](http://localhost:8080/)

You can now:

- View **real-time AI requests** from users
- Monitor request logs, processing time, and token usage
- Track your **rewards** and compute contribution

---

## 💡 Troubleshooting

If things don’t work as expected:

- Ensure **Docker is running**
- Verify **Ollama is installed and responsive**:

```bash
ollama list

```

- Retry the command if you need to restart

---

## 🎉 You're Now Part of the Sight Network!

Your node is officially **live**, **linked to the Gateway**, and ready to serve decentralized AI requests. Every task you process will earn you points redeemable for **$SIGHT tokens**.

---

# 🔧 More Integration-Integrate with Dify Workflow(Optional)

Sight AI has integrated with the Dify platform, allowing users to more easily complete more complex workflows through this platform.

Want to test Sight AI with **Dify's automation flow**? Follow these steps:

### ✅ Install Dify via Docker Compose

Follow Dify's guide: https://docs.dify.ai/getting-started/install-self-hosted/docker-compose

After setup, visit: http://localhost/install to create an admin account.

---

### ✅ Add Ollama Plugin

1. Go to plugin center: http://localhost/plugins?category=discover
2. Search and install the **Ollama Plugin**
3. Navigate: Username → Settings → Model Provider → Add Ollama

For local testing, set:

- `host.docker.internal:11434` → for Ollama
- `host.docker.internal:8716` → for Sight AI backend

![image](https://github.com/user-attachments/assets/d9e6ff0e-3e05-4558-8d19-6a6ebaee5923)


---

### ✅ Create a Dify App

1. Visit: http://localhost/explore/apps
2. Choose any app template
3. Replace the default model with your custom Ollama model
4. Save and launch!

![image1](https://github.com/user-attachments/assets/7684ea7a-6a48-41f2-8591-1692d9fafe76)
