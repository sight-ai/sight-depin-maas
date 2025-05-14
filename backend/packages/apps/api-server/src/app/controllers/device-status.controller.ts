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
        res.status(200).send('Registration successful, starting heartbeat');
      } else {
        res.status(400).send(data);
      }
    } catch (error) {
      res.status(500).send('server error');
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
