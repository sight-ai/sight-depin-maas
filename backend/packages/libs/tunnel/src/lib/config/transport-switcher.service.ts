import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { TransportConfigService, TransportConfigChangedEvent } from './transport-config.service';
import { TransportGatewayType } from '../message-gateway/message-gateway.interface';
import * as childProcess from 'child_process';

/**
 * Transport switch status
 */
export type TransportSwitchStatus = 'idle' | 'switching' | 'restarting' | 'error';

/**
 * Transport switch events
 */
export class TransportSwitchStartedEvent {
  constructor(
    public readonly fromType: TransportGatewayType,
    public readonly toType: TransportGatewayType
  ) {}
}

export class TransportSwitchCompletedEvent {
  constructor(
    public readonly newType: TransportGatewayType,
    public readonly restartRequired: boolean
  ) {}
}

export class TransportSwitchErrorEvent {
  constructor(
    public readonly error: Error,
    public readonly fromType: TransportGatewayType,
    public readonly toType: TransportGatewayType
  ) {}
}

/**
 * Transport switching service
 * Manages dynamic transport layer switching, including application restart
 */
@Injectable()
export class TransportSwitcherService implements OnModuleDestroy {
  private readonly logger = new Logger(TransportSwitcherService.name);
  private currentStatus: TransportSwitchStatus = 'idle';
  private restartTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: TransportConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.logger.log('Transport switching service initialized');
  }

  /**
   * Get current switch status
   */
  getCurrentStatus(): TransportSwitchStatus {
    return this.currentStatus;
  }

  /**
   * Switch transport type
   * @param newType New transport type
   * @param autoRestart Whether to auto-restart application
   * @param restartDelay Restart delay time (milliseconds)
   */
  async switchTransport(
    newType: TransportGatewayType,
    autoRestart: boolean = true,
    restartDelay: number = 3000
  ): Promise<void> {
    if (this.currentStatus !== 'idle') {
      throw new Error(`Cannot switch transport type, current status: ${this.currentStatus}`);
    }

    // Check file configuration instead of current configuration (current config may include CLI parameters)
    const fileConfig = this.configService.getFileConfig();
    const currentFileType = fileConfig?.type || 'libp2p';

    if (currentFileType === newType) {
      this.logger.log(`Transport type in configuration file is already ${newType}, no switch needed`);
      return;
    }

    try {
      this.currentStatus = 'switching';

      this.logger.log(`Starting transport type switch: ${currentFileType} -> ${newType}`);

      // Emit switch started event
      this.eventEmitter.emit(
        'transport.switch.started',
        new TransportSwitchStartedEvent(currentFileType, newType)
      );

      // Update configuration
      await this.configService.switchTransportType(newType, autoRestart);

      // Emit switch completed event
      this.eventEmitter.emit(
        'transport.switch.completed',
        new TransportSwitchCompletedEvent(newType, autoRestart)
      );

      if (autoRestart) {
        this.logger.log(`Application will restart in ${restartDelay}ms`);
        await this.scheduleRestart(restartDelay);
      } else {
        this.currentStatus = 'idle';
        this.logger.log('Transport type switch completed, manual application restart required');
      }

    } catch (error) {
      this.currentStatus = 'error';

      const switchError = error instanceof Error ? error : new Error('Failed to switch transport type');

      this.logger.error(`Failed to switch transport type: ${switchError.message}`);

      // Emit error event
      this.eventEmitter.emit(
        'transport.switch.error',
        new TransportSwitchErrorEvent(switchError, currentFileType, newType)
      );

      // Reset status
      setTimeout(() => {
        this.currentStatus = 'idle';
      }, 5000);

      throw switchError;
    }
  }

  /**
   * Schedule application restart
   */
  private async scheduleRestart(delay: number): Promise<void> {
    this.currentStatus = 'restarting';

    this.restartTimeout = setTimeout(() => {
      this.logger.log('Restarting application...');
      this.restartApplication();
    }, delay);
  }

  /**
   * Restart application
   */
  private restartApplication(): void {
    try {
      // In production environment, may need to use process manager (like PM2) to restart
      if (process.env['NODE_ENV'] === 'production') {
        this.restartWithProcessManager();
      } else {
        this.restartDevelopmentServer();
      }
    } catch (error) {
      this.logger.error(`Failed to restart application: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.currentStatus = 'error';
    }
  }

  /**
   * Restart with process manager (production environment)
   */
  private restartWithProcessManager(): void {
    // Try to restart using PM2
    try {
      childProcess.exec('pm2 restart all', (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`PM2 restart failed: ${error.message}`);
          this.fallbackRestart();
        } else {
          this.logger.log('PM2 restart successful');
        }
      });
    } catch (error) {
      this.logger.warn('PM2 not available, using fallback restart method');
      this.fallbackRestart();
    }
  }

  /**
   * Development environment restart
   */
  private restartDevelopmentServer(): void {
    this.logger.log('Development environment restart: exiting process, will be restarted by process manager');
    process.exit(0);
  }

  /**
   * Fallback restart method
   */
  private fallbackRestart(): void {
    this.logger.log('Using fallback restart method: exiting process');
    process.exit(0);
  }

  /**
   * Cancel scheduled restart
   */
  cancelRestart(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
      this.currentStatus = 'idle';
      this.logger.log('Scheduled restart cancelled');
    }
  }

  /**
   * Listen to configuration change events
   */
  @OnEvent('transport.config.changed')
  handleConfigChanged(event: TransportConfigChangedEvent): void {
    this.logger.log(`Transport configuration changed: ${event.oldConfig.type} -> ${event.newConfig.type}`);

    if (event.newConfig.requiresRestart) {
      this.logger.warn('Configuration change requires application restart to take effect');
    }
  }

  /**
   * Get list of supported transport types
   */
  getSupportedTransportTypes(): TransportGatewayType[] {
    return ['socket', 'libp2p'];
  }

  /**
   * Check if transport type is supported
   */
  isTransportTypeSupported(type: string): boolean {
    return this.getSupportedTransportTypes().includes(type as TransportGatewayType);
  }

  /**
   * Get current transport type
   */
  getCurrentTransportType(): TransportGatewayType {
    return this.configService.getCurrentTransportType();
  }

  /**
   * Quick switch to Socket
   */
  async switchToSocket(autoRestart: boolean = true): Promise<void> {
    await this.switchTransport('socket', autoRestart);
  }

  /**
   * Quick switch to Libp2p
   */
  async switchToLibp2p(autoRestart: boolean = true): Promise<void> {
    await this.switchTransport('libp2p', autoRestart);
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }
}
