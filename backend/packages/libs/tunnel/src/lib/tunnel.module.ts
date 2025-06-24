import { Module, forwardRef } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TunnelServiceImpl } from './tunnel.service';
import { MessageGatewayService, MessageGatewayProvider } from './message-gateway/message-gateway.service';
import { MessageHandlerRegistry } from './message-handler/message-handler.registry';
import { TunnelMessageService } from './services/tunnel-message.service';
import { ModelInferenceClientModule } from '@saito/model-inference-client';
import { DeviceStatusModule } from '@saito/device-status';

// Message Handlers - Income
import { IncomePingHandler } from './message-handler/income/income-ping.handler';
import { IncomePongHandler } from './message-handler/income/income-pong.handler';
import { IncomeContextPingHandler } from './message-handler/income/income-context-ping.handler';
import { IncomeContextPongHandler } from './message-handler/income/income-context-pong.handler';
import { IncomeDeviceRegisterAckHandler } from './message-handler/income/income-device-register-ack.handler';
import { IncomeDeviceRegisterRequestHandler } from './message-handler/income/income-device-register.handler';
import { IncomeDeviceModelReportHandler } from './message-handler/income/income-model-report.handler';
import { IncomeDeviceHeartbeatReportHandler } from './message-handler/income/income-heartbeat-report.handler';
import { IncomeDeviceHeartbeatResponseHandler } from './message-handler/income/income-device-heartbeat-response.handler';
import { IncomeDeviceModelReportResponseHandler } from './message-handler/income/income-device-model-report-response.handler';
import { IncomeChatRequestStreamHandler } from './message-handler/income/income-chat-request-stream.handler';
import { IncomeChatRequestNoStreamHandler } from './message-handler/income/income-chat-request-no-stream.handler';
import { IncomeCompletionRequestStreamHandler } from './message-handler/income/income-completion-request-stream.handler';
import { IncomeCompletionRequestNoStreamHandler } from './message-handler/income/income-completion-request-no-stream.handler';

// Message Handlers - Outcome
import { OutcomePingHandler } from './message-handler/outcome/outcome-ping.handler';
import { OutcomePongHandler } from './message-handler/outcome/outcome-pong.handler';
import { OutcomeContextPingHandler } from './message-handler/outcome/outcome-context-ping.handler';
import { OutcomeContextPongHandler } from './message-handler/outcome/outcome-context-pong.handler';
import { OutcomeDeviceRegisterAckHandler } from './message-handler/outcome/outcome-device-register-ack.handler';
import { OutcomeDeviceRegisterRequestHandler } from './message-handler/outcome/outcome-device-register.handler';
import { OutcomeDeviceModelReportHandler } from './message-handler/outcome/outcome-model-report.handler';
import { OutcomeDeviceHeartbeatReportHandler } from './message-handler/outcome/outcome-heartbeat-report.handler';
import { OutcomeChatResponseStreamHandler } from './message-handler/outcome/outcome-chat-response-stream.handler';
import { OutcomeChatResponseHandler } from './message-handler/outcome/outcome-chat-response.handler';
import { OutcomeCompletionResponseStreamHandler } from './message-handler/outcome/outcome-completion-response-stream.handler';
import { OutcomeCompletionResponseHandler } from './message-handler/outcome/outcome-completion-response.handler';

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
    ModelInferenceClientModule,
    forwardRef(() => DeviceStatusModule)
  ],
  providers: [
    // 新的重构后的服务
    {
      provide: 'TunnelService',
      useClass: TunnelServiceImpl,
    },
    MessageGatewayProvider,
    MessageHandlerRegistry,
    TunnelMessageService,

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
    MessageGatewayProvider,
    MessageHandlerRegistry,
    TunnelMessageService,
  ],
})
export class TunnelModule {}
