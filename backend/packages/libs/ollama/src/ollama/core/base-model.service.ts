import { Injectable, Logger, Inject } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import * as R from 'ramda';
import { MinerService } from '@saito/miner';
import { DeviceStatusService } from '@saito/device-status';
import { Task } from '@saito/models';

@Injectable()
export abstract class BaseModelService {
  protected readonly logger: Logger;
  protected readonly serviceType: string;
  protected readonly DEFAULT_REQUEST_TIMEOUT = 60000; // 60 seconds
  protected readonly STATUS_CHECK_TIMEOUT = 2000; // 2 seconds
  protected readonly MAX_RETRIES = 3;

  constructor(
    serviceType: string,
    loggerName: string,
    @Inject(MinerService)
    protected readonly minerService: MinerService,
    @Inject(DeviceStatusService)
    protected readonly deviceStatusService: DeviceStatusService
  ) {
    this.serviceType = serviceType;
    this.logger = new Logger(loggerName);
  }

  protected async createTask(model: string, task_id?: string, device_id?: string) {
    
    try {
      const deviceId = device_id || await this.deviceStatusService.getDeviceId();
      const task = await this.minerService.createTask({
        model: model,
        device_id: deviceId
      });
      
      
      return task;
    } catch (error) {
      this.logger.error(`Failed to create task for model: ${model}`, error);
      throw error;
    }
  }

  protected async updateTask(taskId: string, taskData: Partial<z.infer<typeof Task>>) {
    
    try {
      await this.minerService.updateTask(taskId, {
        status: taskData.status,
        total_duration: taskData.total_duration ?? null,
        load_duration: taskData.load_duration ?? null,
        prompt_eval_count: taskData.prompt_eval_count ?? null,
        prompt_eval_duration: taskData.prompt_eval_duration ?? null,
        eval_count: taskData.eval_count ?? null,
        eval_duration: taskData.eval_duration ?? null
      });
    } catch (error) {
      this.logger.error(`Failed to update task ${taskId}`, error);
    }
  }

  protected async createEarnings(taskId: string, responseData: any, device_id?: string) {
    try {
      const blockRewards = Math.floor(Math.random() * 100) + 1;
      const jobRewards = R.sum([
        R.propOr(0, 'prompt_eval_count', responseData),
        R.propOr(0, 'eval_count', responseData)
      ]);
      const deviceId = device_id || await this.deviceStatusService.getDeviceId();
      
      await this.minerService.createEarnings(blockRewards, jobRewards, taskId, deviceId);
      
    } catch (error) {
      this.logger.error(`Failed to create earnings for task ${taskId}:`, error);
    }
  }

  protected handleErrorResponse(error: any, res: Response, model: string) {
    this.logger.error('Error handling request:', error);
    if (!res.headersSent) {
      const errorBody = error.response?.body || { error: error.message || 'Unknown error' };
      res.status(400).json({
        ...errorBody,
        model: model || 'unknown',
        created_at: new Date().toISOString(),
        done: true
      });
    }
  }

  protected isRetryableError(error: any): boolean {
    if (!error.response) return true; // Network error
    if (error.code === 'ETIMEDOUT') return true; // Timeout error
    if (error.response.statusCode >= 500) return true; // Server error
    return false;
  }

  protected handleParseError(context: string, error: any, defaultValue: any): any {
    this.logger.error(`Failed to parse ${context}: ${error}`);
    return defaultValue;
  }
}
