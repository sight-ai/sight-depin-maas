const http = require('http');

function testOllamaStream() {
  const options = {
    hostname: 'localhost',
    port: 8716,
    path: '/api/v1/model/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const payload = JSON.stringify({
    "model": "deepscaler",
    "prompt": "你好，请介绍一下自己",
    "stream": true,
    "options": {
      "temperature": 0.7,
      "top_p": 0.9
    },
    "raw": false,
    "keep_alive": "5m"
  });

  const req = http.request(options, (res) => {
    res.setEncoding('utf8');

    res.on('data', (chunk) => {
      try {
        const data = chunk && JSON.parse(chunk);
        console.log("流式数据:", data);
      } catch {
      }
    });

    res.on('end', () => {
      console.log("流式传输结束");
    });
  });

  req.on('error', (error) => {
    console.error("请求错误:", error);
  });

  req.write(payload);
  req.end();
}
testOllamaStream();
