Welcome to **Sight AI** — a decentralized AI network where anyone can contribute compute power for AI inference and earn rewards.

---

## 🧰 1. Prerequisites

Ensure your device has the following tools installed:

### ✅ Install Docker

Visit: https://www.docker.com/

Download and install Docker for your OS (Windows, macOS, or Linux), then launch the app.

### ✅ Install Ollama

Visit: https://ollama.com/

Download and install the appropriate version for your OS. After installation, verify with:

```bash
ollama --version

```

> ⚠️ For Apple M-series (M1/M2/M3) users, run this before proceeding:
> 

```bash
export DOCKER_DEFAULT_PLATFORM=linux/amd64

```

---

## ⚙️ 2. Deploying a Node (CLI Method)

### ✅ Step 1: Wallet Login

1. Visit: https://sightai.io/model/gateway
2. Click **"Connect Wallet"** in the top-right and sign in using MetaMask or WalletConnect.

### ✅ Step 2: Get Your Deployment Command

Click **“Connect New Device”**, and run these command step by step.

![1](https://github.com/user-attachments/assets/2e185df0-6bee-4e12-85ce-24da3718f77c)


```bash
1. curl https://www.sightai.io/model/sight-miner-cli.sh -O
2. chmod +x ./sight-miner-cli.sh
3. ./sight-miner-cli.sh run \
  --reward-address="0xYourWalletAddress" \
  --gateway-url="http://34.84.225.9:8718" \
  --node-code="your-generated-code" \
  --gateway-api-key="your-generated-api-key"
```

---

### ✅ Step 3: Open the Dashboard

Once the node is launched, you’ll see a message like:

![2](https://github.com/user-attachments/assets/5fb24c0f-568f-42d0-8f24-eb61b90b4d00)

```
Please open link: http://localhost:3000/

```

Visit this link to access your **local dashboard**, where you can monitor node status, connection, and earnings.

---

## 💬 3. Starting the Chat Interface (Chatbot UI)

Sight supports integration with open-source frontends (like `chatbot-ui`) for testing AI models locally.

### ✅ Step 1: Clone project

```bash
git clone https://github.com/mckaywrigley/chatbot-ui.git
```

### ✅ Step 2: Install Dependency

```bash
cd chatbot-ui
npm install
```

### ✅ Step 3: Install Supabase CLI

```bash
brew install supabase/tap/supabase
```

### ✅ Step 4: **Start Supabase**

```bash
supabase start
```

After supabase start, it will show some information in the console, look for **API URL** / a**non key** and **service_role key.**

```bash
WARN: no SMS provider is enabled. Disabling phone login
Stopped services: [supabase_imgproxy_chatbotui supabase_edge_runtime_chatbotui supabase_analytics_chatbotui supabase_vector_chatbotui supabase_pooler_chatbotui]
supabase local development setup is running.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local
```

---

### ✅ Step 5: Clone env file to fill in secrets

```bash
cp .env.local.example .env.local
```

### ✅ Step 6: Edit .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL: // set to API URL in step 4
NEXT_PUBLIC_SUPABASE_ANON_KEY: // set to anon key
SUPABASE_SERVICE_ROLE_KEY: // set to service_role key
NEXT_PUBLIC_OLLAMA_URL: // set to [http://localhost:11434](http://localhost:11434/) to test local ollama
// set to [http://localhost:8716](http://localhost:8716/) to test sight local backend
```

### ✅ Step 7: Install Ollama (for test ollama)

https://ollama.com/download/

After installation, download gemma3:4b

```bash
ollama run gemma3:4b
```

### ✅ Step 8: Start chatbot-ui

```bash
npm run chat
```

### ✅ Step 9: Launch Chatbot interface

you’ll see a message like:

![3](https://github.com/user-attachments/assets/b51407fe-d04a-4072-900f-038cecc5875f)


Go for http://localhost:3001（or 3000）for the chatbot, register and sign-in.

### ✅ Step 10: Select local model & Start Chat

click the setting button on the top right corner，click local and select model

![4](https://github.com/user-attachments/assets/ab11fef8-d408-4f43-993d-b35c17276a3b)


After that, you’ll be able to chat directly with the AI.

---

## 📊 4. Dashboard & Real-Time Metrics

After you finish chatting in the chat interface, the Dashboard will display the rewards and specific details processed by the node for handling the chat request.

In your local dashboard (`http://localhost:3000`), you can:

- See your device’s status (online/offline)
- Track current request processing, latency, and node uptime
- View total SIGHT token earnings
- Click **History** to see:
    - Request ID
    - Token usage
    - Reward earned
    - Status

---

## 🔧 5. (Optional) Integrate with Dify Workflow

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

![5](https://github.com/user-attachments/assets/9cf831ef-87ee-453e-873c-a2c1eb36c5ce)

---

### ✅ Create a Dify App

1. Visit: http://localhost/explore/apps
2. Choose any app template
3. Replace the default model with your custom Ollama model
4. Save and launch!

![6](https://github.com/user-attachments/assets/228eeee5-f4ea-470e-9484-51e8de4f4f24)

---

## 🚀 You’re Ready to Mine!

You’ve now completed:

- Compute node deployment
- AI chat interface setup
- Optional Dify workflow integration

At this point, you’ve completed the deployment of your compute node. When users interact with the AI—whether through the chat interface or the AI workflow interface—your compute node will receive the request, process the task, and return the result to the user. The compute node will then receive a reward.
