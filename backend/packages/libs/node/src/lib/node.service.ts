import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { NodeService } from "./node.interface";
import {
    currentLoad,
    mem,
    graphics
} from 'systeminformation';
import { Cron, CronExpression } from '@nestjs/schedule';
import got from 'got-cjs';

@Injectable()
export class DefaultNodeService implements NodeService, OnApplicationBootstrap {
    private readonly logger = new Logger(DefaultNodeService.name);
    private nodeId: string | null = null;
    private readonly maxRetries = 5;
    private retryCount = 0;
    constructor(
    ) {
    }
    async onApplicationBootstrap() {
        await this.registerNode();
    }
    private async registerNode() {
        try {
            const ip = await this.getPublicIP();
            const response = await got.post(process.env['GATEWAY_URL'] + '/node/register', {
                json: {
                    wallet_address: process.env['WALLET_ADDRESS'],
                    signature: process.env['SIGNATURE'],
                    service_url: ip,
                    message: process.env['MESSAGE']
                },
                timeout: {
                    request: 10000
                }
            });

            if (response.statusCode === 201) {
                this.nodeId = JSON.parse(response.body).node_id;
                this.logger.log(`成功注册设备，ID: ${this.nodeId}`);
            }
        } catch (error) {
            this.retryCount++;
            if (this.retryCount <= this.maxRetries) {
                this.logger.warn(`注册失败，3秒后重试 (${this.retryCount}/${this.maxRetries})`);
                setTimeout(() => this.registerNode(), 3000);
            } else {
                this.logger.error('设备注册失败，请检查网络连接和服务可用性');
                process.exit(1);
            }
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async handleHeartbeat() {
        if (!this.nodeId) {
            this.logger.warn('跳过心跳上报：设备未注册');
            return;
        }
        try {
            const metrics = await this.getCurrentNodeInfo();
            await got.post(process.env['GATEWAY_URL'] + '/node/heartbeat', {
                json: {
                    node_id: this.nodeId,
                    ...metrics
                }
            })

            this.logger.log('Successfully sent heartbeat');
        } catch (error) {
            this.logger.error('Failed to send heartbeat', error);
        }
    }

    async getCurrentNodeInfo() {
        const [cpu, memory, gpu] = await Promise.all([
            currentLoad(),
            mem(),
            graphics(),
        ]);

        return {
            cpu_usage: Math.round(cpu.currentLoad),
            memory_usage: Math.round((memory.total - memory.available) / memory.total * 100),
            gpu_usage: this.getGpuUsage(gpu) || 0,
            timestamp: new Date().toISOString(),
        };
    }

    private getGpuUsage(gpuInfo: any) {
        if (gpuInfo?.controllers?.length > 0) {
            const gpu = gpuInfo.controllers[0];
            return gpu.utilizationGpu || null;
        }
        return null;
    }

    private async getPublicIP(): Promise<string> {
        try {
            const response = await got.get('https://api.ipify.org?format=json', {
                timeout: {
                    request: 5000
                }
            });
            return JSON.parse(response.body).ip;
        } catch (error) {
            try {
                const backupResponse = await got.get('https://ipinfo.io/json', {
                    timeout: {
                        request: 5000
                    }
                });
                return JSON.parse(backupResponse.body).ip;
            } catch (err) {
                this.logger.error('Failed to get public IP', err);
                return 'unknown';
            }
        }
    }
}

export const NodeServiceProvider = {
    provide: NodeService,
    useClass: DefaultNodeService
}
