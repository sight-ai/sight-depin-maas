import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TunnelServiceImpl } from './tunnel.service';
import { MessageGatewayService, MessageGatewayProvider } from './message-gateway/message-gateway.service';
import { MessageHandlerRegistry } from './message-handler/message-handler.registry';
import { ModelInferenceClientModule } from '@saito/model-inference-client';

// Message Handlers
import { IncomePingHandler } from './message-handler/income/income-ping.handler';
import { IncomeTaskRequestHandler } from './message-handler/income/income-task-request.handler';
import { OutcomePingHandler } from './message-handler/outcome/outcome-ping.handler';
import { OutcomeTaskResponseHandler } from './message-handler/outcome/outcome-task-response.handler';

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

    // Message Handlers
    IncomePingHandler,
    IncomeTaskRequestHandler,
    OutcomePingHandler,
    OutcomeTaskResponseHandler,

    // 提供PEER_ID
    {
      provide: 'PEER_ID',
      useFactory: () => process.env['DEVICE_ID'] || 'default-device-id',
    },
  ],
  exports: [
    'TunnelService',
    MessageGatewayProvider,
    MessageHandlerRegistry,
  ],
})
export class TunnelModule {}
