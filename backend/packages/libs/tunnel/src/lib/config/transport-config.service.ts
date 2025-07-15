import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransportGatewayType, ITransportGateway, getTransportGatewayType } from '../message-gateway/message-gateway.interface';

/**
 * Transport configuration interface
 */
export interface TransportConfig {
  /** Transport type */
  type: TransportGatewayType;
  /** Configuration update time */
  updatedAt: string;
  /** Whether restart is required */
  requiresRestart: boolean;
}

/**
 * Transport configuration change event
 */
export class TransportConfigChangedEvent {
  constructor(
    public readonly oldConfig: TransportConfig,
    public readonly newConfig: TransportConfig
  ) {}
}

/**
 * Transport configuration management service
 * Manages transport layer configuration with runtime switching support
 */
@Injectable()
export class TransportConfigService {
  private readonly logger = new Logger(TransportConfigService.name);
  private currentConfig: TransportConfig;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Optional() @Inject('MESSAGE_GATEWAY') private readonly messageGateway?: ITransportGateway
  ) {
    // Initialize configuration
    this.currentConfig = this.loadConfig();

    // Only log initialization for non-CLI processes
    if (!this.isCLIProcess()) {
      this.logger.log(`Transport config service initialized, type: ${this.currentConfig.type}`);
    }
  }



  /**
   * Get current transport type from actual running service
   * Falls back to configuration if service is not available
   */
  getCurrentTransportType(): TransportGatewayType {
    // Try to get actual transport type from running service first
    if (this.messageGateway) {
      try {
        return getTransportGatewayType(this.messageGateway);
      } catch (error) {
        this.logger.warn(`Failed to get transport type from gateway: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Fall back to configuration
    return this.currentConfig.type;
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): TransportConfig {
    return { ...this.currentConfig };
  }

  /**
   * Get actual running transport type (for logging and status display)
   */
  getActualTransportType(): TransportGatewayType {
    return this.getCurrentTransportType();
  }

  /**
   * Get file configuration (excluding CLI parameters)
   * Note: This method is deprecated, file storage is no longer used
   */
  getFileConfig(): TransportConfig | null {
    return null;
  }

  /**
   * Switch transport type (in-memory only, no persistence)
   * @param newType New transport type
   * @param requiresRestart Whether application restart is required
   */
  async switchTransportType(newType: TransportGatewayType, requiresRestart: boolean = true): Promise<void> {
    const oldConfig = { ...this.currentConfig };

    this.logger.log(`Switching transport type: ${this.currentConfig.type} -> ${newType}`);

    // Update in-memory configuration
    this.currentConfig = {
      type: newType,
      updatedAt: new Date().toISOString(),
      requiresRestart
    };

    // Emit configuration change event
    this.eventEmitter.emit(
      'transport.config.changed',
      new TransportConfigChangedEvent(oldConfig, this.currentConfig)
    );

    this.logger.log(`Transport type switch completed: ${newType}`);

    if (requiresRestart) {
      this.logger.warn('Configuration change requires application restart to take effect');
    }
  }

  /**
   * Detect if current process is a CLI command process
   */
  private isCLIProcess(): boolean {
    const args = process.argv;
    // Check if it's a CLI command process (cli-wrapper)
    return args.some(arg => arg.includes('cli-wrapper'));
  }



  /**
   * Load configuration from environment variables, CLI parameters or config files
   * Priority: CLI parameters > Environment variables > Default (libp2p)
   */
  private loadConfig(): TransportConfig {
    // If CLI command process, use minimal configuration (no logging)
    if (this.isCLIProcess()) {
      // CLI command processes should not load transport configuration, use default without logging
      return {
        type: 'libp2p',
        updatedAt: new Date().toISOString(),
        requiresRestart: false
      };
    }

    // For all other processes (including backend service processes), perform full configuration loading
    // 1. Priority: CLI parameters
    const cliType = this.getTransportTypeFromCLI();
    if (cliType) {
      this.logger.log(`Loading transport type from CLI parameters: ${cliType}`);
      return {
        type: cliType,
        updatedAt: new Date().toISOString(),
        requiresRestart: false
      };
    }

    // 2. Environment variables
    const envType = process.env['COMMUNICATION_TYPE'];
    if (envType && this.isValidTransportType(envType)) {
      this.logger.log(`Loading transport type from environment variables: ${envType}`);
      return {
        type: envType as TransportGatewayType,
        updatedAt: new Date().toISOString(),
        requiresRestart: false
      };
    }

    // 3. Default value
    this.logger.log('Using default transport type: libp2p');
    return {
      type: 'libp2p',
      updatedAt: new Date().toISOString(),
      requiresRestart: false
    };
  }

  /**
   * Get transport type from CLI parameters
   */
  private getTransportTypeFromCLI(): TransportGatewayType | null {
    const args = process.argv;
    const transportIndex = args.findIndex(arg => arg === '--transport' || arg === '-t');

    if (transportIndex !== -1 && transportIndex + 1 < args.length) {
      const type = args[transportIndex + 1];
      if (this.isValidTransportType(type)) {
        return type as TransportGatewayType;
      }
    }

    return null;
  }

  /**
   * Validate if transport type is valid
   */
  private isValidTransportType(type: string): boolean {
    return type === 'socket' || type === 'libp2p';
  }

  /**
   * Reset configuration to default values
   */
  async resetToDefault(): Promise<void> {
    await this.switchTransportType('libp2p', true);
  }
}
