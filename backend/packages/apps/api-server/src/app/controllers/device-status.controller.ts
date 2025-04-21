import { Body, Controller, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import { DeviceStatusService } from "@saito/device-status";
import { Response } from 'express';

@Controller('/api/v1/device-status')
export class DeviceStatusController {
  private readonly logger = new Logger(DeviceStatusController.name);
  constructor(
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService
  ) { }

  @Post('/register')
  async register(@Res() res: Response, @Body() body: { code: string, gateway_address: string, reward_address: string, key: string }) {
    try {
      const data: {
        success: boolean,
        error: string
      } = await this.deviceStatusService.register(body);
      this.logger.debug('register', data)
      if (data.success) {
        res.status(200).send('Registration successful, starting heartbeat');
      } else {
        res.status(400).send(data);
      }
    } catch (error) {
      res.status(500).send('server error')
    }
  }

  @Get('/gateway-status')
  async getGatewayStatus() {
    return this.deviceStatusService.getGatewayStatus();
  }
}
