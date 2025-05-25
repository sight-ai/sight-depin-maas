import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '@nestjs/common';

/**
 * 注册信息存储接口
 */
export interface RegistrationInfo {
  deviceId: string;
  deviceName: string;
  rewardAddress: string;
  gatewayAddress: string;
  key: string;
  code: string;
  isRegistered: boolean;
  timestamp?: string;
  reportedModels?: string[]; // 已上报的模型列表
  basePath?: string; // API服务器基础路径
}

/**
 * 注册信息存储工具类
 * 负责将注册信息存储在系统用户目录下的.sightai文件夹中
 */
export class RegistrationStorage {
  private readonly logger = new Logger(RegistrationStorage.name);
  private readonly configDir: string;
  private readonly registrationFile: string;

  constructor() {
    // 在 Docker 环境中，优先使用 SIGHTAI_DATA_DIR 环境变量
    const dataDir = process.env['SIGHTAI_DATA_DIR'];

    if (dataDir) {
      // Docker 环境：使用数据卷目录
      this.configDir = path.join(dataDir, 'config');
    } else {
      // 本地环境：使用用户主目录
      const homeDir = os.homedir();
      this.configDir = path.join(homeDir, '.sightai', 'config');
    }

    // 注册信息文件路径
    this.registrationFile = path.join(this.configDir, 'device-registration.json');

    // 确保目录存在
    this.ensureConfigDir();
  }

  /**
   * 确保配置目录存在
   */
  private ensureConfigDir(): void {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
        this.logger.log(`Created config directory: ${this.configDir}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create config directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 保存注册信息
   * @param info 注册信息
   * @returns 是否保存成功
   */
  saveRegistrationInfo(info: RegistrationInfo): boolean {
    try {
      // 添加时间戳
      const dataToSave: RegistrationInfo = {
        ...info,
        timestamp: new Date().toISOString()
      };

      // 写入文件
      fs.writeFileSync(this.registrationFile, JSON.stringify(dataToSave, null, 2));
      this.logger.log('Registration information saved successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to save registration information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 加载注册信息
   * @returns 注册信息，如果不存在则返回null
   */
  loadRegistrationInfo(): RegistrationInfo | null {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(this.registrationFile)) {
        this.logger.debug('No saved registration information found');
        return null;
      }

      // 读取文件
      const data = fs.readFileSync(this.registrationFile, 'utf8');
      const info = JSON.parse(data) as RegistrationInfo;

      this.logger.log('Registration information loaded successfully');
      return info;
    } catch (error) {
      this.logger.error(`Failed to load registration information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * 检查是否有保存的注册信息
   * @returns 是否有保存的注册信息
   */
  hasRegistrationInfo(): boolean {
    return fs.existsSync(this.registrationFile);
  }

  /**
   * 更新已上报的模型信息
   * @param models 模型列表
   * @returns 是否更新成功
   */
  updateReportedModels(models: string[]): boolean {
    try {
      // 先加载现有的注册信息
      const info = this.loadRegistrationInfo();
      if (!info) {
        this.logger.error('No registration information found to update models');
        return false;
      }

      // 更新模型信息
      info.reportedModels = models;
      info.timestamp = new Date().toISOString();

      // 保存更新后的信息
      fs.writeFileSync(this.registrationFile, JSON.stringify(info, null, 2));
      this.logger.log(`Updated reported models: ${models.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update reported models: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 获取已上报的模型信息
   * @returns 模型列表，如果不存在则返回空数组
   */
  getReportedModels(): string[] {
    try {
      const info = this.loadRegistrationInfo();
      return info?.reportedModels || [];
    } catch (error) {
      this.logger.error(`Failed to get reported models: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * 删除注册信息
   * @returns 是否删除成功
   */
  deleteRegistrationInfo(): boolean {
    try {
      if (fs.existsSync(this.registrationFile)) {
        fs.unlinkSync(this.registrationFile);
        this.logger.log('Registration information deleted successfully');
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete registration information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}
