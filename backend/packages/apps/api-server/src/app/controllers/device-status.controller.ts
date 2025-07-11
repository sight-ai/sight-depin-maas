import { Body, Controller, Get, Inject, Logger, Post, Res, Query } from "@nestjs/common";
import { DeviceStatusService, TunnelCommunicationService, DEVICE_SYSTEM_SERVICE, TDeviceSystem, DidIntegrationService } from "@saito/device-status";
import { Response } from 'express';
import { createZodDto } from "nestjs-zod";
import { DeviceCredentials } from "@saito/models";


export class RegisterDeviceDto extends createZodDto(DeviceCredentials) {}



@Controller('/api/v1/device-status')
export class DeviceStatusController {
  private readonly logger = new Logger(DeviceStatusController.name);
  constructor(
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
    @Inject(TunnelCommunicationService) private readonly tunnelService: TunnelCommunicationService,
    @Inject(DEVICE_SYSTEM_SERVICE) private readonly deviceSystemService: TDeviceSystem,
    @Inject(DidIntegrationService) private readonly didIntegrationService: DidIntegrationService
  ) {}

  @Post('/register')
  async register(@Res() res: Response, @Body() body: RegisterDeviceDto) {
    try {
      // 首先尝试通过tunnel发送注册请求，使用自动获取的数据
      try {
        const deviceId = await this.deviceStatusService.getDeviceId();

        // 自动获取系统信息
        const [systemInfo, deviceType, deviceModel] = await Promise.all([
          this.deviceSystemService.collectSystemInfo(),
          this.deviceSystemService.getDeviceType(),
          this.deviceSystemService.getDeviceModel()
        ]);

        const ipAddress = systemInfo.ipAddress;

        const tunnelResult = await this.tunnelService.sendDeviceRegistration(
          deviceId,
          'gateway', // 固定发送给网关
          {
            code: body.code,
            gateway_address: body.gateway_address,
            reward_address: body.reward_address,
            device_type: deviceType, // 自动获取设备类型
            gpu_type: deviceModel, // 自动获取GPU型号
            ip: ipAddress, // 自动获取IP地址
            device_id: deviceId, // 添加DID设备ID
            device_name: `Device-${deviceId.slice(-8)}`, // 基于DID ID生成设备名
            basePath: body.basePath,
            local_models: [] // 可以后续添加模型列表获取
          }
        );

        if (tunnelResult.success) {
          this.logger.log(`✅ 设备注册成功 via WebSocket: ${deviceId}`);
        } else {
          this.logger.warn(`❌ WebSocket注册失败: ${tunnelResult.error}`);
        }
      } catch (tunnelError) {
        this.logger.warn('❌ Failed to send registration via tunnel:', tunnelError);
      }

      // 继续执行原有的HTTP注册逻辑
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

  @Post('/update-did')
  async updateDid(@Res() res: Response) {
    try {
      const result = await this.didIntegrationService.manualUpdateDid();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          deviceId: result.deviceId,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.logger.error('Update DID error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  @Get('/did-info')
  async getDidInfo() {
    try {
      const didInfo = this.didIntegrationService.getCurrentDidInfo();
      return {
        success: true,
        data: didInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Get DID info error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('/registration-info')
  async getRegistrationInfo() {
    try {
      const registrationInfo = await this.deviceStatusService.getRegistrationInfo();

      if (registrationInfo.success) {
        return {
          success: true,
          data: registrationInfo.data,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: registrationInfo.error || 'Failed to get registration info',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      this.logger.error('Get registration info error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

}
