const { io } = require('socket.io-client');

// 使用正确的网关URL和路径
const gatewayUrl = 'https://sightai.io';
const gatewayPath = '/api/model/socket.io';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIweGJhZmY4MkIyNjQ2NGVmNTBDZGNDODEwZDE1ODhEQTU2MTM3MzNCRjQiLCJpc3MiOiJodHRwczovL3NpZ2h0YWkuaW8iLCJhdWQiOiJodHRwczovL3NpZ2h0YWkuaW8iLCJhZGRyZXNzIjoiMHhiYWZmODJCMjY0NjRlZjUwQ2RjQzgxMGQxNTg4REE1NjEzNzMzQkY0IiwiaWF0IjoxNzQ0NjI4NzUwLCJleHAiOjE3NDcyMjA3NTB9.g7ABHpxK-YT76c-UIFRVliyEKC3bZ_alX3McHPqaBn0';

// 创建Socket.IO客户端实例
const socket = io(gatewayUrl, {
    path: gatewayPath,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    transports: ['polling', 'websocket'],
    forceNew: true,
    secure: true,
    rejectUnauthorized: false,
    extraHeaders: {
        'Origin': gatewayUrl,
        'Authorization': `Bearer ${key}`
    }
});

// 连接事件处理
socket.on('connect', () => {
    console.log('Connected to server!');
    console.log('Socket ID:', socket.id);
});

// 错误事件处理
socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    if (error.description === 308) {
        console.log('Received redirect response, please check the URL and path configuration');
    }
});

// 断开连接事件处理
socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
});

// 重连事件处理
socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_attempt', () => {
    console.log('Attempting to reconnect...');
});

// 保持脚本运行
process.on('SIGINT', () => {
    console.log('Closing connection...');
    socket.close();
    process.exit();
});