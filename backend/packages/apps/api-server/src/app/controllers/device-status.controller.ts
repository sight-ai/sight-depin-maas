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
      const data: {
        success: boolean,
        error: string
      } = await this.deviceStatusService.register();
      if (data.success) {
        res.status(200).send('Registration successful, starting heartbeat');
      } else {
        res.status(500).send(data.error);
      }
    } catch (error) {
      res.status(500)
    }
  }
}
