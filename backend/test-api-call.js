#!/usr/bin/env node

const http = require('http');

// 模拟收到的WebSocket消息 - 测试直接调用控制器
const receivedMessage = {
  "from": "gateway",
  "to": "7eec60d7-61f0-436a-9df6-518d9c7b6278",
  "type": "chat_request_stream",
  "payload": {
    "taskId": "test-task-" + Date.now(),
    "path": "/ollama/api/chat",
    "messages": [
      {
        "role": "user",
        "content": "Hello, can you tell me a short joke?"
      }
    ],
    "model": "deepscaler:latest",
    "temperature": 0.7,
    "top_p": 1,
    "stream": true
  },
  "timestamp": Date.now()
};

console.log('收到的消息:', JSON.stringify(receivedMessage, null, 2));

// 构建API请求数据 (直接从payload获取)
const apiRequestData = {
  model: receivedMessage.payload.model,
  messages: receivedMessage.payload.messages,
  temperature: receivedMessage.payload.temperature,
  top_p: receivedMessage.payload.top_p,
  stream: receivedMessage.payload.stream
};

console.log('API请求数据:', JSON.stringify(apiRequestData, null, 2));

// 调用8716端口的API
const postData = JSON.stringify(apiRequestData);

const options = {
  hostname: 'localhost',
  port: 8716,
  path: receivedMessage.payload.path || '/ollama/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('发起API请求到:', `http://${options.hostname}:${options.port}${options.path}`);

// 存储流式响应数据
let streamChunks = [];
let fullContent = '';

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, res.headers);

  res.on('data', (chunk) => {
    const chunkStr = chunk.toString();
    console.log('收到数据块:', chunkStr.substring(0, 200) + '...');

    // 解析流式数据
    const lines = chunkStr.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log('流式响应完成');
          break;
        }

        try {
          const parsed = JSON.parse(data);
          streamChunks.push(parsed);

          // 提取内容
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
            fullContent += parsed.choices[0].delta.content;
          }
        } catch (parseError) {
          console.warn(`解析流式数据失败: ${data}`);
        }
      }
    }
  });

  res.on('end', () => {
    console.log('响应完成');
    console.log('完整内容:', fullContent);

    // 构建outcome响应消息
    const outcomeMessage = {
      type: 'chat_request_stream',
      from: receivedMessage.to,
      to: receivedMessage.from,
      payload: {
        taskId: receivedMessage.payload.taskId,
        path: receivedMessage.payload.path,
        messages: receivedMessage.payload.messages,
        chunk: {
          id: 'response-' + Date.now(),
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: receivedMessage.payload.model,
          choices: [{
            index: 0,
            delta: {
              role: 'assistant',
              content: fullContent
            },
            finish_reason: 'stop'
          }]
        },
        done: true
      }
    };

    console.log('\n构建的outcome响应消息:');
    console.log(JSON.stringify(outcomeMessage, null, 2));

    // 这里可以发送到WebSocket或其他目标
    console.log('\n✅ 成功处理聊天请求并构建响应消息');
  });
});

req.on('error', (error) => {
  console.error('请求错误:', error);

  // 构建错误响应消息
  const errorMessage = {
    type: 'chat_request_stream',
    from: receivedMessage.to,
    to: receivedMessage.from,
    payload: {
      taskId: receivedMessage.payload.taskId,
      path: receivedMessage.payload.path,
      messages: receivedMessage.payload.messages,
      error: error.message,
      done: true
    }
  };

  console.log('\n构建的错误响应消息:');
  console.log(JSON.stringify(errorMessage, null, 2));
});

// 发送请求数据
req.write(postData);
req.end();
