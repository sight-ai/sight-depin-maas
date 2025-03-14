import { Injectable, Inject, Logger } from "@nestjs/common";
import { DeviceStatusRepository } from "./device-status.repository";
import { DatabaseTransactionConnection } from "slonik";
import { Cron, CronExpression } from '@nestjs/schedule';
import { OllamaService } from "@saito/ollama";

@Injectable()
export class DeviceStatusService {
  private readonly logger = new Logger(DeviceStatusService.name);

  constructor(
    private readonly deviceStatusRepository: DeviceStatusRepository,
    @Inject(OllamaService)
    private readonly ollamaService: OllamaService
  ) { }

  async updateDeviceStatus(deviceId: string, name: string, status: "online" | "offline") {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.updateDeviceStatus(conn, deviceId, name, status);
    });
  }

  async getDeviceStatus(deviceId: string) {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceStatus(conn, deviceId);
    });
  }

  async markInactiveDevicesOffline(inactiveDuration: number) {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      const thresholdTime = new Date(Date.now() - inactiveDuration);
      return this.deviceStatusRepository.markDevicesOffline(conn, thresholdTime);
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkOllamaStatus() {
    const deviceId = process.env['OLLAMA_DEVICE_ID'];
    const deviceName = process.env['OLLAMA_DEVICE_NAME']

    if (!deviceId || !deviceName) {
      return;
    }

    try {
      const isOnline = await this.isOllamaOnline();
      const status: "online" | "offline" = isOnline ? "online" : "offline";
      if (isOnline) {
        await this.updateDeviceStatus(deviceId, deviceName, status);
      } else {
        const inactiveDuration = 1000 * 60;
        this.markInactiveDevicesOffline(inactiveDuration)
      }
    } catch (error) {
      const inactiveDuration = 1000 * 60;
      this.markInactiveDevicesOffline(inactiveDuration)
    }
  }

  private async isOllamaOnline(): Promise<boolean> {
    try {
      return await this.ollamaService.checkStatus();
    } catch (error) {
      return false;
    }
  }
}
