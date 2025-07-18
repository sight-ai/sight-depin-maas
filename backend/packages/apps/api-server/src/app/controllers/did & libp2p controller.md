# DID & libp2p Controller API 文档

所有接口基础路径：/did 和 /peer

默认端口：8716



## /did

| **方法** | **路径**           | **说明**        | **请求体** | **返回值**        |
| -------- | ------------------ | --------------- | ---------- | ----------------- |
| GET      | /did/document      | 获取本地DID文档 | 无         | DID文档对象       |
| GET      | /did/my-did        | 获取本地DID     | 无         | PeerId/DID 字符串 |
| GET      | /did/my-public-key | 获取本地公钥    | 无         | 公钥字符串        |



## /peer

| **方法** | **路径**                       | **说明**           | **请求体**                             | **返回**         |
| -------- | ------------------------------ | ------------------ | -------------------------------------- | ---------------- |
| GET      | /peer/all-documents            | 获取全部DID文档    | 无                                     | DID文档数组      |
| GET      | /peer/neighbors                | 获取邻居节点PeerId | 无                                     | PeerId列表       |
| GET      | /peer/find/:peerId             | 查找Peer的地址     | 无                                     | PeerId与地址     |
| GET      | /peer/public-key/:peerId       | 获取Peer的公钥     | 无                                     | PeerId与公钥     |
| POST     | /peer/connect/:input           | 主动连接Peer       | 无                                     | 连接状态         |
| POST     | /peer/ping/:input              | ping探活           | 无                                     | RTT延迟/连接信息 |
| POST     | /peer/send-test-message/:input | 点对点测试消息     | { "peerId": "xxx", "message": "内容" } | 发送结果         |
| GET      | /peer/health                   | 服务健康检查       | 无                                     | 健康信息         |

#### /did相关

- **GET /did/document**

  返回本地DID文档：

```json
{
  "success": true,
  "data": { ...DID文档 }
}
```

- **GET /did/my-did**

  返回本地DID（PeerId）字符串：

```json
{
  "success": true,
  "data": "xxx"
}
```

- **GET /did/my-public-key**

  返回本地公钥字符串：

```json
{
  "success": true,
  "data": "xxx"
}
```

#### /peer相关

- **GET /peer/all-documents**

  返回所有DID文档（数组）：

```json
{
  "success": true,
  "data": [ ...DID文档数组 ]
}
```

- **GET /peer/neighbors**

  查看邻居节点（未实现）：

```json
// success:
{
  "success": true,
  "data": {
    "neighbors": [ "peerId1", "peerId2", ... ]
  }
}
  
// fail：
{
  "success": "false",
  "message": error
}
```

- **GET /peer/find/:peerId**

  查找Peer对应的地址（MultiAddr）：

```json
// success:
{
  "success": true,
  "data": { 
    "peerId": "xxx", 
    "addrs": ["/ip4/127.0.0.1/tcp/15001", ...] 
  }
}
  
// fail：
{
  "success": "false",
  "message": error
}
```

- **GET /peer/public-key/:peerId**

  获取Peer的公钥：

```json
// success:
{
  "success": true,
  "data": { "peerId": "xxx", "publicKey": "xxx" }
}

// fail：
{
  "success": "false",
  "message": error
}
```

- **POST /peer/connect/:input**

  主动连接Peer（input为DID或MultiAddr）：

```json
// success：
{
  "success": true,
  "result": { 
    "did/multiAddr": "xxx",
    "status": "connected"
  },
  "input": "xxx"
}

// fail：
{
  "success": "false",
  "message": error
}
```

- **POST /peer/ping/:input**

  ping目标Peer（input为DID或MultiAddr）：

```json
// success：
{
  "success": true,
  "result": { 
    "did/multiAddr": "xxx",
    "rtt_ms": x<number>
  },
  "input": "xxx"
}

// fail：
{
  "success": "false",
  "message": error
}
```

- **POST /peer/send-test-message/:input**

  向目标Peer点对点发送消息（input 为DID或MultiAddr）：

```json
// success
{
  "success": true,
  "result": { "status": "ok" },
  "input": {
    "input": "xxx",
  }
}

// fail
{
  "success": "false",
  "message": error
}
```

- **GET /peer/health**

  服务健康检查：

```json
// success
{
  "success": true,
  "data": { 
    "message": "Sight Libp2p Node is running",
    "status": "healthy",
    "timestamp": "2025-07-18T02:57:53+08:00"
  }
}

// fail：
{
  "success": "false",
  "message": error
}
```



## 备注

- 所有已完成接口均返回 { success: true, data: ... }
- 端口为本地 8716，如需其它端口请确认后端配置