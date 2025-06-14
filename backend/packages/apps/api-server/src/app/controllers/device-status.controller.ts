import { Body, Controller, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import { DeviceStatusService } from "@saito/device-status";
import { Response } from 'express';
import { createZodDto } from "nestjs-zod";
import { DeviceCredentials } from "@saito/models";
import * as R from 'ramda';

export class RegisterDeviceDto extends createZodDto(DeviceCredentials) {}

@Controller('/api/v1/device-status')
export class DeviceStatusController {
  private readonly logger = new Logger(DeviceStatusController.name);
  constructor(
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService
  ) {}

  @Post('/register')
  async register(@Res() res: Response, @Body() body: RegisterDeviceDto) {
    try {
      const data = await this.deviceStatusService.register(body);

      if (data.success) {
        res.status(200).json({
          success: true,
          message: 'Registration successful, starting heartbeat',
          deviceId: data.node_id,
          deviceName: data.name,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Registration failed',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  @Get('/gateway-status')
  async getGatewayStatus() {
    return this.deviceStatusService.getGatewayStatus();
  }

  @Get('/gateway-address')
  async getGatewayAddress() {
    const gatewayAddress = await this.deviceStatusService.getGatewayAddress();
    return { gatewayAddress };
  }
}
