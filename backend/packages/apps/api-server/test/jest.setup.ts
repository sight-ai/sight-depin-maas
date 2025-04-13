// Save original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

// Set test environment variables
process.env.NODE_ENV = 'development';
process.env.GATEWAY_API_URL = 'http://localhost:3000';
process.env.GATEWAY_API_KEY = 'test-key';
process.env.NODE_CODE = 'test-code';
process.env.REWARD_ADDRESS = 'test-address';
process.env.DEVICE_TYPE = 'test-device';
process.env.GPU_MODEL = 'test-gpu';

// Restore original NODE_ENV after tests
afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
}); 