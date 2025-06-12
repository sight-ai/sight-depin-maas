import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TunnelServiceImpl } from './tunnel.service';
import { MessageGatewayService, MessageGatewayProvider } from './message-gateway/message-gateway.service';
import { MessageHandlerRegistry } from './message-handler/message-handler.registry';
import { ModelInferenceClientModule } from '@saito/model-inference-client';

// Message Handlers - Income
import { IncomePingHandler } from './message-handler/income/income-ping.handler';
import { IncomePongHandler } from './message-handler/income/income-pong.handler';
import { IncomeContextPingHandler } from './message-handler/income/income-context-ping.handler';
import { IncomeContextPongHandler } from './message-handler/income/income-context-pong.handler';
import { IncomeDeviceRegistrationHandler } from './message-handler/income/income-device-registration.handler';
import { IncomeDeviceRegisterAckHandler } from './message-handler/income/income-device-register-ack.handler';
import { IncomeChatRequestStreamHandler } from './message-handler/income/income-chat-request-stream.handler';
// import { IncomeChatRequestNoStreamHandler } from './message-handler/income/income-chat-request-no-stream.handler'; // 暂时移除

// Message Handlers - Outcome
import { OutcomePingHandler } from './message-handler/outcome/outcome-ping.handler';
import { OutcomePongHandler } from './message-handler/outcome/outcome-pong.handler';
import { OutcomeContextPingHandler } from './message-handler/outcome/outcome-context-ping.handler';
import { OutcomeContextPongHandler } from './message-handler/outcome/outcome-context-pong.handler';
import { OutcomeDeviceRegistrationHandler } from './message-handler/outcome/outcome-device-registration.handler';
import { OutcomeDeviceRegisterAckHandler } from './message-handler/outcome/outcome-device-register-ack.handler';
import { OutcomeChatRequestStreamHandler } from './message-handler/outcome/outcome-chat-request-stream.handler';
import { OutcomeChatRequestNoStreamHandler } from './message-handler/outcome/outcome-chat-request-no-stream.handler';
import { OutcomeChatResponseStreamHandler } from './message-handler/outcome/outcome-chat-response-stream.handler';

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

@Module({
  imports: [
    DiscoveryModule,
    ModelInferenceClientModule
  ],
  providers: [
    // 新的重构后的服务
    {
      provide: 'TunnelService',
      useClass: TunnelServiceImpl,
    },
    MessageGatewayProvider,
    MessageHandlerRegistry,

    // Income Message Handlers
    IncomePingHandler,
    IncomePongHandler,
    IncomeContextPingHandler,
    IncomeContextPongHandler,
    IncomeDeviceRegistrationHandler,
    IncomeDeviceRegisterAckHandler,
    IncomeChatRequestStreamHandler,
    // IncomeChatRequestNoStreamHandler, // 暂时移除

    // Outcome Message Handlers
    OutcomePingHandler,
    OutcomePongHandler,
    OutcomeContextPingHandler,
    OutcomeContextPongHandler,
    OutcomeDeviceRegistrationHandler,
    OutcomeDeviceRegisterAckHandler,
    OutcomeChatRequestStreamHandler,
    OutcomeChatRequestNoStreamHandler,
    OutcomeChatResponseStreamHandler,

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
    MessageGatewayProvider,
    MessageHandlerRegistry,
  ],
})
export class TunnelModule {}
