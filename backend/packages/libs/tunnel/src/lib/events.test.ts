import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import {
  TUNNEL_EVENTS,
  TunnelConnectionEstablishedEvent,
  TunnelMessageReceivedEvent,
  TunnelHeartbeatReceivedEvent,
  TunnelDeviceStatusUpdateRequestEvent
} from './events';

describe('Tunnel Events', () => {
  let eventEmitter: EventEmitter2;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
    }).compile();

    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should emit and listen to connection established event', (done) => {
    const deviceId = 'test-device-123';
    const gatewayUrl = 'ws://localhost:3001';

    // 设置事件监听器
    eventEmitter.on(TUNNEL_EVENTS.CONNECTION_ESTABLISHED, (event: TunnelConnectionEstablishedEvent) => {
      expect(event.deviceId).toBe(deviceId);
      expect(event.gatewayUrl).toBe(gatewayUrl);
      expect(event.timestamp).toBeDefined();
      done();
    });

    // 发射事件
    eventEmitter.emit(
      TUNNEL_EVENTS.CONNECTION_ESTABLISHED,
      new TunnelConnectionEstablishedEvent(deviceId, gatewayUrl)
    );
  });

  it('should emit and listen to heartbeat received event', (done) => {
    const fromDeviceId = 'device-456';
    const payload = { cpu_usage: 50, memory_usage: 60 };

    // 设置事件监听器
    eventEmitter.on(TUNNEL_EVENTS.HEARTBEAT_RECEIVED, (event: TunnelHeartbeatReceivedEvent) => {
      expect(event.fromDeviceId).toBe(fromDeviceId);
      expect(event.payload).toEqual(payload);
      expect(event.timestamp).toBeDefined();
      done();
    });

    // 发射事件
    eventEmitter.emit(
      TUNNEL_EVENTS.HEARTBEAT_RECEIVED,
      new TunnelHeartbeatReceivedEvent(fromDeviceId, payload)
    );
  });

  it('should emit and listen to device status update request event', (done) => {
    const deviceId = 'device-789';
    const status = 'online';
    const reason = 'Connection established';

    // 设置事件监听器
    eventEmitter.on(TUNNEL_EVENTS.DEVICE_STATUS_UPDATE_REQUEST, (event: TunnelDeviceStatusUpdateRequestEvent) => {
      expect(event.deviceId).toBe(deviceId);
      expect(event.status).toBe(status);
      expect(event.reason).toBe(reason);
      expect(event.timestamp).toBeDefined();
      done();
    });

    // 发射事件
    eventEmitter.emit(
      TUNNEL_EVENTS.DEVICE_STATUS_UPDATE_REQUEST,
      new TunnelDeviceStatusUpdateRequestEvent(deviceId, status, reason)
    );
  });

  it('should handle multiple listeners for the same event', () => {
    const deviceId = 'test-device-multi';
    const gatewayUrl = 'ws://localhost:3002';
    let listener1Called = false;
    let listener2Called = false;

    // 设置第一个监听器
    eventEmitter.on(TUNNEL_EVENTS.CONNECTION_ESTABLISHED, () => {
      listener1Called = true;
    });

    // 设置第二个监听器
    eventEmitter.on(TUNNEL_EVENTS.CONNECTION_ESTABLISHED, () => {
      listener2Called = true;
    });

    // 发射事件
    eventEmitter.emit(
      TUNNEL_EVENTS.CONNECTION_ESTABLISHED,
      new TunnelConnectionEstablishedEvent(deviceId, gatewayUrl)
    );

    // 验证两个监听器都被调用
    expect(listener1Called).toBe(true);
    expect(listener2Called).toBe(true);
  });

  it('should verify event constants are correctly defined', () => {
    expect(TUNNEL_EVENTS.CONNECTION_ESTABLISHED).toBe('tunnel.connection.established');
    expect(TUNNEL_EVENTS.CONNECTION_LOST).toBe('tunnel.connection.lost');
    expect(TUNNEL_EVENTS.MESSAGE_RECEIVED).toBe('tunnel.message.received');
    expect(TUNNEL_EVENTS.MESSAGE_SENT).toBe('tunnel.message.sent');
    expect(TUNNEL_EVENTS.HEARTBEAT_RECEIVED).toBe('tunnel.heartbeat.received');
    expect(TUNNEL_EVENTS.DEVICE_STATUS_UPDATE_REQUEST).toBe('tunnel.device.status.update.request');
    expect(TUNNEL_EVENTS.ERROR).toBe('tunnel.error');
  });
});
