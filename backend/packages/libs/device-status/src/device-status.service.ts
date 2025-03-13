import { Injectable } from "@nestjs/common";
import { DeviceStatusRepository } from "./device-status.repository";
import { DatabaseTransactionConnection } from "slonik";
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DeviceStatusService {
  constructor(private readonly deviceStatusRepository: DeviceStatusRepository) {}

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
  @Cron(CronExpression.EVERY_30_SECONDS) // Run every 30 seconds
  async autoMarkInactiveDevicesOffline() {
    const inactiveDuration = 1000 * 60; 
    console.log('Running cron job to mark inactive devices as offline...');
    await this.markInactiveDevicesOffline(inactiveDuration); // Mark devices as offline
  }
}
