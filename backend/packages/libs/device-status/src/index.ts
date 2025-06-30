// Core services
export * from './device-status.interface';
export * from './device-status.module';
export * from './device-status.service';
export * from './registration-storage';

// New optimized service components
export { default as DeviceRegistryServiceProvider } from './services/device-registry.service';
export { default as DeviceConfigServiceProvider } from './services/device-config.service';
export { default as DeviceDatabaseServiceProvider } from './services/device-database.service';
export { default as DeviceHeartbeatServiceProvider } from './services/device-heartbeat.service';
export { default as DeviceSystemServiceProvider } from './services/device-system.service';
export { default as DeviceGatewayServiceProvider } from './services/device-gateway.service';
export { default as AutoRegistrationServiceProvider } from './services/auto-registration.service';
export { default as StartupInitializationServiceProvider } from './services/startup-initialization.service';
export * from './services/dynamic-config.service';
export { default as TunnelCommunicationServiceProvider } from './services/tunnel-communication.service';
export * from './services/tunnel-communication.service';
export * from './services/did-integration.service';

// Enhanced device status services
export * from './services/environment-detector.service';
export * from './services/device-status-manager.service';
export * from './services/enhanced-device-status.service';

// Utilities
export * from './utils/error-handler';

// Constants and utilities
export * from './constants/system-info.constants';
