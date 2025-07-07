import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { SocketMessageGatewayService } from './message-gateway/message-gateway.service';
import { MessageHandlerRegistry } from './message-handler/message-handler.registry';
import { TunnelMessageService } from './services/tunnel-message.service';
import { ITransportGateway } from './message-gateway/message-gateway.interface';
import { TunnelServiceImpl } from './tunnel.service';
import { TransportConfigService } from './config/transport-config.service';
import { TransportSwitcherService } from './config/transport-switcher.service';

// 定义本地接口标识符，避免循环依赖
export const TUNNEL_SERVICE = Symbol('TUNNEL_SERVICE');
export const TUNNEL_MESSAGE_SERVICE = Symbol('TUNNEL_MESSAGE_SERVICE');

// Message Handlers - Income
import { IncomeChatRequestNoStreamHandler } from './message-handler/income/income-chat-request-no-stream.handler';
import { IncomeChatRequestStreamHandler } from './message-handler/income/income-chat-request-stream.handler';
import { IncomeCompletionRequestNoStreamHandler } from './message-handler/income/income-completion-request-no-stream.handler';
import { IncomeCompletionRequestStreamHandler } from './message-handler/income/income-completion-request-stream.handler';
import { IncomeContextPingHandler } from './message-handler/income/income-context-ping.handler';
import { IncomeContextPongHandler } from './message-handler/income/income-context-pong.handler';
import { IncomeDeviceHeartbeatResponseHandler } from './message-handler/income/income-device-heartbeat-response.handler';
import { IncomeDeviceModelReportResponseHandler } from './message-handler/income/income-device-model-report-response.handler';
import { IncomeDeviceRegisterAckHandler } from './message-handler/income/income-device-register-ack.handler';
import { IncomeDeviceRegisterRequestHandler } from './message-handler/income/income-device-register.handler';
import { IncomeDeviceHeartbeatReportHandler } from './message-handler/income/income-heartbeat-report.handler';
import { IncomeDeviceModelReportHandler } from './message-handler/income/income-model-report.handler';
import { IncomePingHandler } from './message-handler/income/income-ping.handler';
import { IncomePongHandler } from './message-handler/income/income-pong.handler';

// Message Handlers - Outcome
import {
  MessageGatewayLibp2pProvider,
  MessageGatewayLibp2pService,
} from './message-gateway';
import { OutcomeChatResponseStreamHandler } from './message-handler/outcome/outcome-chat-response-stream.handler';
import { OutcomeChatResponseHandler } from './message-handler/outcome/outcome-chat-response.handler';
import { OutcomeCompletionResponseStreamHandler } from './message-handler/outcome/outcome-completion-response-stream.handler';
import { OutcomeCompletionResponseHandler } from './message-handler/outcome/outcome-completion-response.handler';
import { OutcomeContextPingHandler } from './message-handler/outcome/outcome-context-ping.handler';
import { OutcomeContextPongHandler } from './message-handler/outcome/outcome-context-pong.handler';
import { OutcomeDeviceRegisterAckHandler } from './message-handler/outcome/outcome-device-register-ack.handler';
import { OutcomeDeviceRegisterRequestHandler } from './message-handler/outcome/outcome-device-register.handler';
import { OutcomeDeviceHeartbeatReportHandler } from './message-handler/outcome/outcome-heartbeat-report.handler';
import { OutcomeDeviceModelReportHandler } from './message-handler/outcome/outcome-model-report.handler';
import { OutcomePingHandler } from './message-handler/outcome/outcome-ping.handler';
import { OutcomePongHandler } from './message-handler/outcome/outcome-pong.handler';

/**
 * 动态PEER_ID提供者
 * 允许在运行时更新PEER_ID值
 */
export class DynamicPeerIdProvider {
  private _peerId: string = '';

  setPeerId(peerId: string): void {
    this._peerId = peerId;
  }

  getPeerId(): string {
    return this._peerId;
  }
}

/**
 * 全局PEER_ID提供者实例
 */
export const GLOBAL_PEER_ID_PROVIDER = new DynamicPeerIdProvider();

/**
 * Transport Gateway工厂Provider
 */
export const TransportGatewayProvider = {
  provide: 'MessageGateway',
  useFactory: (configService: TransportConfigService): ITransportGateway => {
    const transportType = configService.getCurrentTransportType();
    if (transportType === 'libp2p') {
      return new MessageGatewayLibp2pService();
    } else {
      // 默认使用Socket实现
      return new SocketMessageGatewayService();
    }
  },
  inject: [TransportConfigService],
};

/**
 * Tunnel Service Provider
 */
export const TunnelServiceProvider = {
  provide: 'TunnelService',
  useFactory: (
    handlerRegistry: MessageHandlerRegistry,
    messageGateway: ITransportGateway,
    peerId: string,
    eventEmitter: EventEmitter2
  ) => {
    // 统一的实现，根据MessageGateway类型自动适配
    return new TunnelServiceImpl(handlerRegistry, messageGateway, peerId, eventEmitter);
  },
  inject: [MessageHandlerRegistry, 'MessageGateway', 'PEER_ID', EventEmitter2],
};

@Module({
  imports: [ DiscoveryModule, EventEmitterModule],
  providers: [
    // 配置管理服务
    TransportConfigService,
    TransportSwitcherService,

    // 核心服务
    TunnelServiceProvider,
    TransportGatewayProvider,
    MessageHandlerRegistry,
    TunnelMessageService,
    MessageGatewayLibp2pProvider,
    MessageGatewayLibp2pService,

    // Income Message Handlers
    IncomePingHandler,
    IncomePongHandler,
    IncomeContextPingHandler,
    IncomeContextPongHandler,
    IncomeDeviceRegisterAckHandler,
    IncomeDeviceRegisterRequestHandler,
    IncomeDeviceModelReportHandler,
    IncomeDeviceHeartbeatReportHandler,
    IncomeDeviceHeartbeatResponseHandler,
    IncomeDeviceModelReportResponseHandler,
    IncomeChatRequestStreamHandler,
    IncomeChatRequestNoStreamHandler,
    IncomeCompletionRequestStreamHandler,
    IncomeCompletionRequestNoStreamHandler,

    // Outcome Message Handlers
    OutcomePingHandler,
    OutcomePongHandler,
    OutcomeContextPingHandler,
    OutcomeContextPongHandler,
    OutcomeDeviceRegisterAckHandler,
    OutcomeDeviceRegisterRequestHandler,
    OutcomeDeviceModelReportHandler,
    OutcomeDeviceHeartbeatReportHandler,
    OutcomeChatResponseStreamHandler,
    OutcomeChatResponseHandler,
    OutcomeCompletionResponseStreamHandler,
    OutcomeCompletionResponseHandler,

    // 动态PEER_ID提供者
    {
      provide: DynamicPeerIdProvider,
      useValue: GLOBAL_PEER_ID_PROVIDER,
    },

    // 提供PEER_ID - 从全局提供者获取
    {
      provide: 'PEER_ID',
      useFactory: () => GLOBAL_PEER_ID_PROVIDER.getPeerId(),
    },
  ],
  exports: [
    'TunnelService',
    TransportGatewayProvider,
    MessageHandlerRegistry,
    TunnelMessageService,
    MessageGatewayLibp2pProvider,
    MessageGatewayLibp2pService,

    // 配置管理服务
    TransportConfigService,
    TransportSwitcherService,
  ],
})
export class TunnelModule {}
