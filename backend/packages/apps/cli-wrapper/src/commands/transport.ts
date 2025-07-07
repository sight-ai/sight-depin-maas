/**
 * Transport layer configuration CLI commands
 * Used for managing transport layer configuration and switching transport types
 */

import { Command } from 'commander';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TransportConfigService,
  TransportSwitcherService,
  getTransportGatewayType,
  TransportGatewayType
} from '@saito/tunnel';
import { ProcessManagerService } from '../services/process-manager';

export class TransportCommand {
  private readonly logger = new Logger(TransportCommand.name);
  private configService: TransportConfigService | null = null;
  private switcherService: TransportSwitcherService | null = null;

  constructor() {
    // Lazy initialization, create services only when needed
  }

  /**
   * Get or initialize configuration service
   */
  private getConfigService(): TransportConfigService {
    if (!this.configService) {
      const eventEmitter = new EventEmitter2();
      this.configService = new TransportConfigService(eventEmitter);
    }
    return this.configService;
  }

  /**
   * Get or initialize switcher service
   */
  private getSwitcherService(): TransportSwitcherService {
    if (!this.switcherService) {
      const configService = this.getConfigService();
      const eventEmitter = new EventEmitter2();
      this.switcherService = new TransportSwitcherService(configService, eventEmitter);
    }
    return this.switcherService;
  }

  /**
   * Create transport command
   */
  createCommand(): Command {
    const transportCmd = new Command('transport');
    transportCmd.description('Transport layer configuration management');

    // status subcommand
    transportCmd
      .command('status')
      .description('Show current transport configuration status')
      .action(async () => {
        await this.showStatus();
      });

    // switch subcommand
    transportCmd
      .command('switch <type>')
      .description('Switch transport type (socket|libp2p)')
      .option('--no-restart', 'Do not auto-restart application when switching')
      .option('--delay <ms>', 'Set restart delay time (milliseconds)', '3000')
      .action(async (type: string, options: { restart: boolean; delay: string }) => {
        const delay = parseInt(options.delay, 10);
        await this.switchTransport(type, options.restart, delay);
      });

    // switch-socket subcommand
    transportCmd
      .command('switch-socket')
      .description('Switch to Socket transport')
      .option('--no-restart', 'Do not auto-restart application when switching')
      .option('--delay <ms>', 'Set restart delay time (milliseconds)', '3000')
      .action(async (options: { restart: boolean; delay: string }) => {
        const delay = parseInt(options.delay, 10);
        await this.switchTransport('socket', options.restart, delay);
      });

    // switch-libp2p subcommand
    transportCmd
      .command('switch-libp2p')
      .description('Switch to Libp2p transport')
      .option('--no-restart', 'Do not auto-restart application when switching')
      .option('--delay <ms>', 'Set restart delay time (milliseconds)', '3000')
      .action(async (options: { restart: boolean; delay: string }) => {
        const delay = parseInt(options.delay, 10);
        await this.switchTransport('libp2p', options.restart, delay);
      });

    // list subcommand
    transportCmd
      .command('list')
      .description('List supported transport types')
      .action(async () => {
        await this.listTransportTypes();
      });

    return transportCmd;
  }

  /**
   * Show current status
   */
  private async showStatus(): Promise<void> {
    try {
      const supportedTypes = this.getSwitcherService().getSupportedTransportTypes();
      const serverStatus = ProcessManagerService.getServerStatus();

      console.log('\n📊 Transport Layer Status');
      console.log('==================');

      // If service is running, show actual transport type
      if (serverStatus.running && serverStatus.transportType) {
        console.log(`Current type: ${serverStatus.transportType}`);
      } else {
        // If service is not running, show transport type from configuration
        const config = this.getConfigService().getCurrentConfig();
        console.log(`Current type: ${config.type} (service not running)`);
      }

      console.log(`Supported types: ${supportedTypes.join(', ')}`);
      console.log(`Service status: ${serverStatus.running ? 'Running' : 'Stopped'}`);
      if (serverStatus.running) {
        console.log(`Process ID: ${serverStatus.pid}`);
      }
      console.log('\n💡 Tip: Transport type is controlled by CLI parameters, no config file needed');
      console.log('Use sight start --daemon --transport <type> to start with specified transport type');
      console.log('Use sight transport switch <type> to switch transport type');
    } catch (error) {
      console.error(`❌ Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * Switch transport type (implemented by restarting process)
   */
  private async switchTransport(
    type: string,
    autoRestart: boolean = true,
    delay: number = 3000
  ): Promise<void> {
    try {
      if (!this.getSwitcherService().isTransportTypeSupported(type)) {
        console.error(`❌ Unsupported transport type: ${type}`);
        console.log(`Supported types: ${this.getSwitcherService().getSupportedTransportTypes().join(', ')}`);
        process.exit(1);
      }

      console.log(`🔄 Switching transport type to: ${type}`);

      if (autoRestart) {
        // Check if backend service is running
        const serverStatus = ProcessManagerService.getServerStatus();

        if (serverStatus.running) {
          // Stop backend service
          console.log('🛑 Stopping backend service...');
          const stopResult = ProcessManagerService.stopDaemonProcess();

          if (stopResult.success) {
            console.log('✅ Backend service stopped');

            // Wait for specified delay
            if (delay > 0) {
              console.log(`⏳ Waiting ${delay}ms before restart...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Restart backend service with new transport type
            console.log('🚀 Restarting backend service...');
            const startResult = ProcessManagerService.startDaemonProcess([`--transport`, type]);

            if (startResult.success) {
              console.log('✅ Backend service restarted');
              console.log(`📊 Process ID: ${startResult.pid}`);
              console.log(`🌐 Transport type: ${type}`);
            } else {
              console.error(`❌ Restart failed: ${startResult.error}`);
              console.log('Please run manually: sight start --daemon --transport ' + type);
              process.exit(1);
            }
          } else {
            console.error(`❌ Failed to stop service: ${stopResult.error}`);
            console.log('Please restart service manually');
            process.exit(1);
          }
        } else {
          console.log('ℹ️  Backend service not running, starting service...');

          // Start backend service directly
          console.log('🚀 Starting backend service...');
          const startResult = ProcessManagerService.startDaemonProcess([`--transport`, type]);

          if (startResult.success) {
            console.log('✅ Backend service started');
            console.log(`📊 Process ID: ${startResult.pid}`);
            console.log(`🌐 Transport type: ${type}`);
          } else {
            console.error(`❌ Start failed: ${startResult.error}`);
            console.log('Please run manually: sight start --daemon --transport ' + type);
            process.exit(1);
          }
        }
      } else {
        console.log('✅ Transport type switch completed, please restart application manually');
        console.log(`Run the following command to restart: sight stop && sight start --daemon --transport ${type}`);
      }
    } catch (error) {
      console.error(`❌ Switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * List supported transport types
   */
  private async listTransportTypes(): Promise<void> {
    try {
      const supportedTypes = this.getSwitcherService().getSupportedTransportTypes();

      // Get actual running transport type from server status
      let currentType: string | null = null;
      try {
        const status = ProcessManagerService.getServerStatus();
        currentType = status?.transportType || null;
      } catch (error) {
        // If server is not running, no current type
        currentType = null;
      }

      console.log('\n📋 Supported Transport Types');
      console.log('==================');
      supportedTypes.forEach(type => {
        const isCurrent = currentType && type === currentType;
        const marker = isCurrent ? '✅' : '  ';
        console.log(`${marker} ${type}${isCurrent ? ' (current)' : ''}`);
      });

      console.log('\n💡 Usage:');
      console.log('sight start --daemon --transport <type>  # Start with specified transport type');
      console.log('sight transport switch <type>           # Switch transport type');
    } catch (error) {
      console.error(`❌ Failed to get transport types: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }
}

/**
 * Factory function to create transport command
 */
export function createTransportCommand(): Command {
  const transportCommand = new TransportCommand();
  return transportCommand.createCommand();
}
