#!/usr/bin/env node

// 模拟实际收到的嵌套格式消息
const nestedMessage = {
  "from": "gateway",
  "to": "7eec60d7-61f0-436a-9df6-518d9c7b6278",
  "type": "chat_request_stream",
  "payload": {
    "taskId": "ad3aadec-1a85-4b84-92c4-43863aa9e597",
    "data": {
      "model": "deepscaler:latest",
      "messages": [
        {
          "role": "user",
          "content": "Hello, tell me a joke"
        }
      ],
      "stream": true
    }
  }
};

console.log('测试嵌套格式消息:');
console.log(JSON.stringify(nestedMessage, null, 2));

// 模拟parseNestedDataFormat函数
function parseNestedDataFormat(message) {
  const payload = message.payload;
  
  if (!payload.taskId || !payload.data) {
    throw new Error('Invalid nested data format: missing taskId or data');
  }
  
  const data = payload.data;
  
  // 转换为标准格式
  return {
    type: 'chat_request_stream',
    from: message.from,
    to: message.to,
    payload: {
      taskId: payload.taskId,
      path: payload.path || '/ollama/api/chat', // 默认路径
      messages: data.messages || [],
      model: data.model,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      top_p: data.top_p,
      frequency_penalty: data.frequency_penalty,
      presence_penalty: data.presence_penalty
    }
  };
}

try {
  const standardMessage = parseNestedDataFormat(nestedMessage);
  console.log('\n转换后的标准格式:');
  console.log(JSON.stringify(standardMessage, null, 2));
  console.log('\n✅ 消息格式转换成功!');
} catch (error) {
  console.error('\n❌ 消息格式转换失败:', error.message);
}
