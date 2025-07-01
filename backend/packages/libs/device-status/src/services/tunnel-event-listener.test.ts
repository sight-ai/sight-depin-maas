import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { TunnelEventListenerService } from './tunnel-event-listener.service';
import { DeviceStatusManagerService } from './device-status-manager.service';
import {
  TUNNEL_EVENTS,
  TunnelConnectionEstablishedEvent,
  TunnelConnectionLostEvent,
  TunnelHeartbeatReceivedEvent
} from '@saito/tunnel';

describe('TunnelEventListenerService', () => {
  let service: TunnelEventListenerService;
  let eventEmitter: EventEmitter2;
  let deviceStatusManager: jest.Mocked<DeviceStatusManagerService>;
  let module: TestingModule;

  beforeEach(async () => {
    const mockDeviceStatusManager = {
      updateDeviceStatus: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        TunnelEventListenerService,
        {
          provide: DeviceStatusManagerService,
          useValue: mockDeviceStatusManager,
        },
        {
          provide: 'DEVICE_CONFIG_SERVICE',
          useValue: null,
        },
        {
          provide: 'DEVICE_SYSTEM_SERVICE',
          useValue: null,
        },
      ],
    }).compile();

    service = module.get<TunnelEventListenerService>(TunnelEventListenerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    deviceStatusManager = module.get(DeviceStatusManagerService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle connection established event', async () => {
    const event = new TunnelConnectionEstablishedEvent('device-123', 'ws://localhost:3001');

    // 直接调用处理方法
    await service.handleConnectionEstablished(event);

    // 验证设备状态管理器被调用
    expect(deviceStatusManager.updateDeviceStatus).toHaveBeenCalledWith(
      'online',
      'Tunnel connection established'
    );
  });

  it('should handle connection lost event', async () => {
    const event = new TunnelConnectionLostEvent('device-123', 'Network error');

    // 直接调用处理方法
    await service.handleConnectionLost(event);

    // 验证设备状态管理器被调用
    expect(deviceStatusManager.updateDeviceStatus).toHaveBeenCalledWith(
      'offline',
      'Connection lost: Network error'
    );
  });

  it('should handle heartbeat received event', async () => {
    const event = new TunnelHeartbeatReceivedEvent('device-456', { cpu_usage: 50 });

    // 发射事件
    eventEmitter.emit(TUNNEL_EVENTS.HEARTBEAT_RECEIVED, event);

    // 等待事件处理
    await new Promise(resolve => setTimeout(resolve, 10));

    // 心跳事件不应该调用 updateDeviceStatus
    expect(deviceStatusManager.updateDeviceStatus).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // 模拟 updateDeviceStatus 抛出错误
    deviceStatusManager.updateDeviceStatus.mockRejectedValue(new Error('Update failed'));

    const event = new TunnelConnectionEstablishedEvent('device-123', 'ws://localhost:3001');

    // 直接调用处理方法 - 不应该抛出错误
    await expect(service.handleConnectionEstablished(event)).resolves.not.toThrow();

    // 验证方法仍然被调用
    expect(deviceStatusManager.updateDeviceStatus).toHaveBeenCalled();
  });
});
