export * from './tunnel.interface';
export * from './tunnel.module';
export * from './tunnel.service';
// 重构后的服务组件
export * from './message-gateway/message-gateway.interface';
export * from './message-gateway/message-gateway.service';
export * from './message-handler';
export * from './services/tunnel-message.service';
export * from './errors';
export * from './events';

// 导出具体的类和模块
export { TunnelModule } from './tunnel.module';
export { TunnelServiceImpl } from './tunnel.service';
export { TunnelMessageService } from './services/tunnel-message.service';
export { MessageHandlerRegistry } from './message-handler/message-handler.registry';
