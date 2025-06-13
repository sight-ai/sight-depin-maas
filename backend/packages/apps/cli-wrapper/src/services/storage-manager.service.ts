import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  IStorageManager, 
  RegistrationInfo, 
  ModelReport,
  CliError 
} from '../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * 存储管理服务 
 * 只负责CLI本地数据的存储和管理
 */
export class StorageManagerService implements IStorageManager {
  private readonly storagePath: string;
  private static readonly REGISTRATION_FILE = 'registration.json';
  private static readonly MODEL_REPORT_FILE = 'model-report.json';

  constructor(
    private readonly errorHandler: ErrorHandlerService = new ErrorHandlerService(),
    customStoragePath?: string
  ) {
    this.storagePath = customStoragePath || this.getDefaultStoragePath();
  }

  /**
   * 保存注册信息
   */
  async saveRegistration(info: RegistrationInfo): Promise<void> {
    try {
      await this.ensureStorageExists();
      
      const filePath = path.join(this.storagePath, StorageManagerService.REGISTRATION_FILE);
      const data = JSON.stringify(info, null, 2);
      
      await fs.promises.writeFile(filePath, data, 'utf8');
    } catch (error) {
      throw new CliError(
        `Failed to save registration info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_SAVE_ERROR',
        { operation: 'saveRegistration', path: this.storagePath }
      );
    }
  }

  async loadRegistrationInfo(): Promise<RegistrationInfo | null> {
    return this.loadRegistration();
  }

  /**
   * 加载注册信息
   */
  async loadRegistration(): Promise<RegistrationInfo | null> {
    try {
      const filePath = path.join(this.storagePath, StorageManagerService.REGISTRATION_FILE);
      
      if (!await this.fileExists(filePath)) {
        return null;
      }

      const data = await fs.promises.readFile(filePath, 'utf8');
      const info = JSON.parse(data) as RegistrationInfo;
      
      // 验证数据结构
      if (!this.isValidRegistrationInfo(info)) {
        throw new CliError('Invalid registration data format', 'INVALID_DATA_FORMAT');
      }

      return info;
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }
      
      throw new CliError(
        `Failed to load registration info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_LOAD_ERROR',
        { operation: 'loadRegistration', path: this.storagePath }
      );
    }
  }

  /**
   * 清除注册信息
   */
  async clearRegistration(): Promise<void> {
    try {
      const filePath = path.join(this.storagePath, StorageManagerService.REGISTRATION_FILE);
      
      if (await this.fileExists(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      throw new CliError(
        `Failed to clear registration info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_CLEAR_ERROR',
        { operation: 'clearRegistration', path: this.storagePath }
      );
    }
  }

  /**
   * 保存模型报告
   */
  async saveModelReport(report: ModelReport): Promise<void> {
    try {
      await this.ensureStorageExists();
      
      const filePath = path.join(this.storagePath, StorageManagerService.MODEL_REPORT_FILE);
      
      // 加载现有报告历史
      let reports: ModelReport[] = [];
      if (await this.fileExists(filePath)) {
        try {
          const existingData = await fs.promises.readFile(filePath, 'utf8');
          reports = JSON.parse(existingData);
          if (!Array.isArray(reports)) {
            reports = [];
          }
        } catch {
          // 如果文件损坏，重新开始
          reports = [];
        }
      }

      // 添加新报告
      reports.push(report);
      
      // 保持最近100个报告
      if (reports.length > 100) {
        reports = reports.slice(-100);
      }

      const data = JSON.stringify(reports, null, 2);
      await fs.promises.writeFile(filePath, data, 'utf8');
    } catch (error) {
      throw new CliError(
        `Failed to save model report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_SAVE_ERROR',
        { operation: 'saveModelReport', path: this.storagePath }
      );
    }
  }

  /**
   * 加载模型报告
   */
  async loadModelReport(): Promise<ModelReport | null> {
    try {
      const filePath = path.join(this.storagePath, StorageManagerService.MODEL_REPORT_FILE);

      if (!await this.fileExists(filePath)) {
        return null;
      }

      const data = await fs.promises.readFile(filePath, 'utf8');
      const reports = JSON.parse(data) as ModelReport[];

      if (!Array.isArray(reports) || reports.length === 0) {
        return null;
      }

      // 返回最新的报告
      return reports[reports.length - 1];
    } catch (error) {
      throw new CliError(
        `Failed to load model report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_LOAD_ERROR',
        { operation: 'loadModelReport', path: this.storagePath }
      );
    }
  }

  /**
   * 获取已报告的模型列表
   */
  async getReportedModels(): Promise<ModelReport[]> {
    try {
      const filePath = path.join(this.storagePath, StorageManagerService.MODEL_REPORT_FILE);

      if (!await this.fileExists(filePath)) {
        return [];
      }

      const data = await fs.promises.readFile(filePath, 'utf8');
      const reports = JSON.parse(data) as ModelReport[];

      if (!Array.isArray(reports)) {
        return [];
      }

      return reports;
    } catch (error) {
      throw new CliError(
        `Failed to get reported models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_LOAD_ERROR',
        { operation: 'getReportedModels', path: this.storagePath }
      );
    }
  }

  /**
   * 获取存储路径
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * 确保存储目录存在
   */
  async ensureStorageExists(): Promise<void> {
    try {
      await fs.promises.mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      throw new CliError(
        `Failed to create storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_CREATE_ERROR',
        { path: this.storagePath }
      );
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    path: string;
    exists: boolean;
    size: number;
    files: string[];
    lastModified?: Date;
  }> {
    try {
      const exists = await this.directoryExists(this.storagePath);
      
      if (!exists) {
        return {
          path: this.storagePath,
          exists: false,
          size: 0,
          files: []
        };
      }

      const files = await fs.promises.readdir(this.storagePath);
      let totalSize = 0;
      let lastModified: Date | undefined;

      for (const file of files) {
        const filePath = path.join(this.storagePath, file);
        try {
          const stats = await fs.promises.stat(filePath);
          totalSize += stats.size;
          
          if (!lastModified || stats.mtime > lastModified) {
            lastModified = stats.mtime;
          }
        } catch {
          // 忽略无法访问的文件
        }
      }

      return {
        path: this.storagePath,
        exists: true,
        size: totalSize,
        files,
        lastModified
      };
    } catch (error) {
      throw new CliError(
        `Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_STATS_ERROR',
        { path: this.storagePath }
      );
    }
  }

  /**
   * 清理存储
   */
  async cleanupStorage(): Promise<{ deletedFiles: string[]; errors: string[] }> {
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    try {
      const exists = await this.directoryExists(this.storagePath);
      if (!exists) {
        return { deletedFiles, errors };
      }

      const files = await fs.promises.readdir(this.storagePath);
      
      for (const file of files) {
        const filePath = path.join(this.storagePath, file);
        try {
          await fs.promises.unlink(filePath);
          deletedFiles.push(file);
        } catch (error) {
          errors.push(`Failed to delete ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { deletedFiles, errors };
    } catch (error) {
      errors.push(`Failed to cleanup storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { deletedFiles, errors };
    }
  }

  /**
   * 备份存储数据
   */
  async backupStorage(backupPath?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultBackupPath = path.join(os.tmpdir(), `sightai-backup-${timestamp}`);
      const targetPath = backupPath || defaultBackupPath;

      await fs.promises.mkdir(targetPath, { recursive: true });

      const exists = await this.directoryExists(this.storagePath);
      if (!exists) {
        throw new CliError('Storage directory does not exist', 'STORAGE_NOT_EXISTS');
      }

      const files = await fs.promises.readdir(this.storagePath);
      
      for (const file of files) {
        const sourcePath = path.join(this.storagePath, file);
        const targetFilePath = path.join(targetPath, file);
        
        await fs.promises.copyFile(sourcePath, targetFilePath);
      }

      return targetPath;
    } catch (error) {
      throw new CliError(
        `Failed to backup storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_BACKUP_ERROR',
        { sourcePath: this.storagePath, targetPath: backupPath }
      );
    }
  }

  /**
   * 获取默认存储路径
   */
  private getDefaultStoragePath(): string {
    const dataDir = process.env['SIGHTAI_DATA_DIR'];
    
    if (dataDir) {
      return dataDir;
    }

    const homeDir = os.homedir();
    return path.join(homeDir, '.sightai');
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查目录是否存在
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 验证注册信息格式
   */
  private isValidRegistrationInfo(info: any): info is RegistrationInfo {
    return (
      typeof info === 'object' &&
      typeof info.deviceId === 'string' &&
      typeof info.deviceName === 'string' &&
      typeof info.gatewayAddress === 'string' &&
      typeof info.rewardAddress === 'string' &&
      typeof info.isRegistered === 'boolean' &&
      typeof info.timestamp === 'string'
    );
  }
}
