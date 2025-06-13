// Save original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

// Set test environment variables
process.env.NODE_ENV = 'development';
// 注意：DEVICE_TYPE 和 GPU_MODEL 已改为动态获取，不再需要环境变量
// 注意：GATEWAY_API_URL, NODE_CODE, REWARD_ADDRESS 等应从注册信息动态获取

// Restore original NODE_ENV after tests
afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
});