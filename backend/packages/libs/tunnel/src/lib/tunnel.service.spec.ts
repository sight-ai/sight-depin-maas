import { Test, TestingModule } from '@nestjs/testing';
import { TunnelServiceImpl } from './tunnel.service';
import { MessageHandlerRegistry } from './message-handler/message-handler.registry';
import { MessageGateway } from './message-gateway/message-gateway.interface';
import { PingMessage, PongMessage } from '@saito/models';

describe('TunnelServiceImpl', () => {
  let service: TunnelServiceImpl;
  let mockMessageGateway: jest.Mocked<MessageGateway>;
  let mockHandlerRegistry: Partial<MessageHandlerRegistry>;

  beforeEach(async () => {
    // 创建模拟对象
    mockMessageGateway = {
      sendMessage: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      registerDevice: jest.fn(),
      isConnected: jest.fn(),
      getDeviceId: jest.fn(),
      onMessage: jest.fn(),
      onConnectionChange: jest.fn(),
      onError: jest.fn(),
    };

    mockHandlerRegistry = {
      getIncomeHandler: jest.fn(),
      getOutcomeHandler: jest.fn(),
      getHandlerDescriptors: jest.fn(),
      onModuleInit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TunnelServiceImpl,
        {
          provide: 'MessageGateway',
          useValue: mockMessageGateway,
        },
        {
          provide: MessageHandlerRegistry,
          useValue: mockHandlerRegistry,
        },
        {
          provide: 'PEER_ID',
          useValue: 'test-device-id',
        },
      ],
    }).compile();

    service = module.get<TunnelServiceImpl>(TunnelServiceImpl);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send message through gateway', async () => {
    const message: PingMessage = {
      type: 'ping',
      from: 'test-device-id',
      to: 'target-device',
      payload: {
        message: 'test ping',
        timestamp: Date.now(),
      },
    };

    await service.sendMessage(message);

    expect(mockMessageGateway.sendMessage).toHaveBeenCalledWith(message);
  });

  it('should connect socket through gateway', async () => {
    const gatewayAddress = 'ws://localhost:3000';
    const key = 'test-key';
    const code = 'test-code';

    await service.createSocket(gatewayAddress, key, code);

    expect(mockMessageGateway.connect).toHaveBeenCalledWith(gatewayAddress, key, code, undefined);
  });

  it('should register device through gateway', async () => {
    const deviceId = 'test-device-123';

    await service.connectSocket(deviceId);

    expect(mockMessageGateway.registerDevice).toHaveBeenCalledWith(deviceId);
    expect(service.node_id).toBe(deviceId);
  });

  it('should disconnect through gateway', async () => {
    await service.disconnectSocket();

    expect(mockMessageGateway.disconnect).toHaveBeenCalled();
  });

  it('should handle stream handlers registration', async () => {
    const taskId = 'task-123';
    const targetDeviceId = 'device-456';
    const onMessage = jest.fn();

    await service.handleRegisterStreamHandler({
      taskId,
      targetDeviceId,
      onMessage,
    });

    // 验证处理器已注册
    expect(service['streamHandlers'].has(taskId)).toBe(true);
    expect(service['deviceTaskMap'].get(targetDeviceId)?.has(taskId)).toBe(true);
  });

  it('should handle no-stream handlers registration', async () => {
    const taskId = 'task-789';
    const targetDeviceId = 'device-101';
    const onMessage = jest.fn();

    await service.handleRegisterNoStreamHandler({
      taskId,
      targetDeviceId,
      onMessage,
    });

    // 验证处理器已注册
    expect(service['noStreamHandlers'].has(taskId)).toBe(true);
    expect(service['deviceTaskMap'].get(targetDeviceId)?.has(taskId)).toBe(true);
  });
});
