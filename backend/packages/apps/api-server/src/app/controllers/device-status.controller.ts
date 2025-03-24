import { Body, Controller, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import { DeviceStatusService } from "@saito/device-status";
import { Response } from 'express';

@Controller('/api/v1/device-status')
export class DeviceStatusController {
  constructor(
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService
  ) { }

  @Post('/register')
  async register(@Res() res: Response) {
    try {
      await this.deviceStatusService.register();
      res.status(200).send('Registration successful, starting heartbeat');
    } catch (error) {
      res.status(500)
    }
  }
}
