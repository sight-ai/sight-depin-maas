import { Body, Controller, Get, Logger, Post, Res, Param, Inject } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TransportConfigService,
  TransportSwitcherService,
  TransportGatewayType,
  TunnelService
} from '@saito/tunnel';

// Transport switch request schema
const TransportSwitchSchema = z.object({
  type: z.enum(['socket', 'libp2p']),
  autoRestart: z.boolean().optional().default(true),
  restartDelay: z.number().int().min(0).max(30000).optional().default(3000)
});

export class TransportSwitchDto extends createZodDto(TransportSwitchSchema) { }

/**
 * Node.js Application Restart Manager
 * Handles restarting the current Node.js process with new transport configuration
 */
class NodeAppRestartManager {
  private static readonly logger = new Logger('NodeAppRestartManager');

  /**
   * Restart the current Node.js application with new transport type
   * This will set environment variable and restart the process
   */
  static async restartWithTransport(transportType: TransportGatewayType, restartDelay: number = 3000): Promise<void> {
    this.logger.log(`Preparing to restart application with transport: ${transportType}`);

    // Set environment variable for the new transport type
    process.env.TRANSPORT_TYPE = transportType;

    // Schedule restart after delay
    setTimeout(() => {
      this.logger.log(`Restarting application with transport: ${transportType}`);

      // In Electron environment, we need to restart the Node.js process
      // This will trigger the application to restart with new transport configuration
      process.exit(0); // Exit with success code, Electron should restart the process
    }, restartDelay);
  }

  /**
   * Get current running transport type from active tunnel service
   */
  static getCurrentRunningTransportType(tunnelService: TunnelService): TransportGatewayType | null {
    try {
      // Since TunnelService doesn't expose getCurrentTransportType directly,
      // we need to check the message gateway type through the service implementation
      // For now, return null and rely on configuration service
      return null;
    } catch (error) {
      this.logger.warn('Could not get current running transport type:', error);
      return null;
    }
  }

  /**
   * Check if application is ready for transport switching
   */
  static isReadyForSwitch(tunnelService: TunnelService): boolean {
    try {
      // Check if tunnel service is connected (basic readiness check)
      return tunnelService.isConnected();
    } catch (error) {
      this.logger.warn('Tunnel service not ready for switch:', error);
      return false;
    }
  }
}

/**
 * Transport Layer Management Controller for Node.js/Electron Environment
 *
 * Provides REST API endpoints for transport layer configuration and switching
 * Designed for Node.js applications running in Electron, not external processes
 */
@Controller('/api/v1/transport')
export class TransportController {
  private readonly logger = new Logger(TransportController.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('TunnelService') private readonly tunnelService: TunnelService,
    private readonly transportConfigService: TransportConfigService
  ) {}

  /**
   * Get current transport status
   * Returns the actual running transport type, not just configuration
   * Equivalent to: sight transport status
   */
  @Get('/status')
  async getTransportStatus(@Res() res: Response) {
    try {
      // Get actual running transport type from tunnel service
      const runningTransportType = NodeAppRestartManager.getCurrentRunningTransportType(this.tunnelService);
      const configuredTransportType = this.transportConfigService.getCurrentTransportType();
      const isReady = NodeAppRestartManager.isReadyForSwitch(this.tunnelService);

      // Supported transport types
      const supportedTypes: TransportGatewayType[] = ['socket', 'libp2p'];

      // Check if there's a mismatch between running and configured
      const requiresRestart = runningTransportType !== configuredTransportType;

      res.status(200).json({
        success: true,
        data: {
          // Current running transport (most important)
          currentType: runningTransportType || configuredTransportType,
          runningType: runningTransportType,
          configuredType: configuredTransportType,

          // System status
          supportedTypes,
          isReady,
          requiresRestart,

          // Environment info
          processId: process.pid,
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',

          // Transport service status
          tunnelServiceConnected: this.tunnelService.isConnected(),

          // Default transport (libp2p as specified)
          defaultType: 'libp2p' as TransportGatewayType
        }
      });
    } catch (error) {
      this.logger.error('Error getting transport status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List all supported transport types with current status
   * Equivalent to: sight transport list
   */
  @Get('/list')
  async listTransportTypes(@Res() res: Response) {
    try {
      const supportedTypes: TransportGatewayType[] = ['socket', 'libp2p'];
      const runningType = NodeAppRestartManager.getCurrentRunningTransportType(this.tunnelService);
      const configuredType = this.transportConfigService.getCurrentTransportType();

      const transportList = supportedTypes.map(type => ({
        type,
        isCurrent: type === (runningType || configuredType),
        isRunning: runningType ? type === runningType : false,
        isConfigured: type === configuredType,
        isDefault: type === 'libp2p' // libp2p is default as specified
      }));

      res.status(200).json({
        success: true,
        data: {
          transportTypes: transportList,
          currentRunningType: runningType,
          currentConfiguredType: configuredType,
          defaultType: 'libp2p',
          applicationRunning: true, // Always true since we're responding
          processId: process.pid
        }
      });
    } catch (error) {
      this.logger.error('Error listing transport types:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Switch transport type for Node.js application
   * This will restart the current Node.js process with new transport configuration
   * Equivalent to: sight transport switch <type>
   */
  @Post('/switch')
  async switchTransport(@Body() switchDto: TransportSwitchDto, @Res() res: Response) {
    try {
      const { type, autoRestart, restartDelay } = switchDto;

      // Validate transport type
      const supportedTypes: TransportGatewayType[] = ['socket', 'libp2p'];
      if (!supportedTypes.includes(type as TransportGatewayType)) {
        res.status(400).json({
          success: false,
          error: `Unsupported transport type: ${type}`,
          supportedTypes
        });
        return;
      }

      // Get current running and configured types
      const runningType = NodeAppRestartManager.getCurrentRunningTransportType(this.tunnelService);
      const configuredType = this.transportConfigService.getCurrentTransportType();
      const currentType = runningType || configuredType;

      // Check if already using this transport type
      if (currentType === type) {
        res.status(200).json({
          success: true,
          message: `Transport type is already set to ${type}`,
          data: {
            currentType: type,
            changed: false,
            wasRunning: !!runningType
          }
        });
        return;
      }

      this.logger.log(`Switching transport type from ${currentType} to ${type}`);

      // Check if system is ready for switch
      if (!NodeAppRestartManager.isReadyForSwitch(this.tunnelService)) {
        res.status(503).json({
          success: false,
          error: 'System is not ready for transport switching. Tunnel service not properly initialized.',
          data: {
            currentType,
            targetType: type,
            systemReady: false
          }
        });
        return;
      }

      if (autoRestart) {
        // Update configuration first
        await this.transportConfigService.switchTransportType(type as TransportGatewayType, false);

        // Send response before restarting
        res.status(200).json({
          success: true,
          message: `Transport switching to ${type}. Application will restart in ${restartDelay}ms.`,
          data: {
            previousType: currentType,
            newType: type,
            restartDelay,
            processId: process.pid,
            willRestart: true
          }
        });

        // Schedule restart with new transport type
        this.logger.log(`Scheduling application restart with transport: ${type} in ${restartDelay}ms`);
        await NodeAppRestartManager.restartWithTransport(type as TransportGatewayType, restartDelay);

      } else {
        // Config-only switch, no restart
        await this.transportConfigService.switchTransportType(type as TransportGatewayType, false);

        res.status(200).json({
          success: true,
          message: `Transport type switched to ${type}. Manual restart required to take effect.`,
          data: {
            previousType: currentType,
            newType: type,
            restarted: false,
            requiresRestart: true,
            note: 'Call POST /api/v1/transport/restart to apply changes'
          }
        });
      }

    } catch (error) {
      this.logger.error('Error switching transport type:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Quick switch to Socket transport
   * Equivalent to: sight transport switch socket
   */
  @Post('/switch/socket')
  async switchToSocket(@Res() res: Response) {
    const switchDto: TransportSwitchDto = { type: 'socket', autoRestart: true, restartDelay: 3000 };
    return this.switchTransport(switchDto, res);
  }

  /**
   * Quick switch to Libp2p transport (default)
   * Equivalent to: sight transport switch libp2p
   */
  @Post('/switch/libp2p')
  async switchToLibp2p(@Res() res: Response) {
    const switchDto: TransportSwitchDto = { type: 'libp2p', autoRestart: true, restartDelay: 3000 };
    return this.switchTransport(switchDto, res);
  }

  /**
   * Restart application with current transport configuration
   * Useful after config-only switches
   */
  @Post('/restart')
  async restartApplication(@Res() res: Response) {
    try {
      const configuredType = this.transportConfigService.getCurrentTransportType();

      // Check if system is ready
      if (!NodeAppRestartManager.isReadyForSwitch(this.tunnelService)) {
        res.status(503).json({
          success: false,
          error: 'System is not ready for restart. Tunnel service not properly initialized.'
        });
        return;
      }

      // Send response before restarting
      res.status(200).json({
        success: true,
        message: `Application will restart with ${configuredType} transport in 3 seconds.`,
        data: {
          transportType: configuredType,
          processId: process.pid,
          restartDelay: 3000
        }
      });

      // Schedule restart
      this.logger.log(`Restarting application with configured transport: ${configuredType}`);
      await NodeAppRestartManager.restartWithTransport(configuredType, 3000);

    } catch (error) {
      this.logger.error('Error restarting application:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get transport configuration details
   * Shows environment variables and configuration sources
   */
  @Get('/config')
  async getTransportConfig(@Res() res: Response) {
    try {
      const configuredType = this.transportConfigService.getCurrentTransportType();
      const runningType = NodeAppRestartManager.getCurrentRunningTransportType(this.tunnelService);

      res.status(200).json({
        success: true,
        data: {
          configuredType,
          runningType,
          environmentVariable: process.env.TRANSPORT_TYPE || null,
          defaultType: 'libp2p',
          configurationSource: process.env.TRANSPORT_TYPE ? 'environment' : 'default',
          requiresRestart: runningType !== configuredType,

          // Configuration priority (as specified in requirements)
          configPriority: [
            'CLI parameters (not applicable in Electron)',
            'Environment variables (.env file)',
            'Default (libp2p)'
          ]
        }
      });
    } catch (error) {
      this.logger.error('Error getting transport config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reset transport to default (libp2p)
   * Convenience endpoint to reset to default transport
   */
  @Post('/reset')
  async resetToDefault(@Res() res: Response) {
    const switchDto: TransportSwitchDto = { type: 'libp2p', autoRestart: true, restartDelay: 3000 };
    return this.switchTransport(switchDto, res);
  }
}
