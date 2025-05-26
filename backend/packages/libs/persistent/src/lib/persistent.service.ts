import { OnModuleDestroy, Logger } from '@nestjs/common';
import { Level } from 'level';
import fs from 'fs';
import path from 'path';
import { env } from '../env';
import { PersistentService } from './persistent.interface';
import { DatabaseTransactionConnection } from 'slonik';

export class DefaultPersistentService
  extends PersistentService
  implements OnModuleDestroy
{
  private readonly logger = new Logger(DefaultPersistentService.name);
  private _db: Level | null = null;
  private _isClosing: boolean = false;

  // 子数据库
  private _deviceStatusDb: any = null;
  private _tasksDb: any = null;
  private _earningsDb: any = null;

  get db(): any {
    if (this._db === null) {
      throw new Error('LevelDB database is not initialized');
    }
    return this._db;
  }

  // 获取设备状态子数据库
  get deviceStatusDb(): any {
    if (this._deviceStatusDb === null) {
      throw new Error('Device status sublevel is not initialized');
    }
    return this._deviceStatusDb;
  }

  // 获取任务子数据库
  get tasksDb(): any {
    if (this._tasksDb === null) {
      throw new Error('Tasks sublevel is not initialized');
    }
    return this._tasksDb;
  }

  // 获取收益子数据库
  get earningsDb(): any {
    if (this._earningsDb === null) {
      throw new Error('Earnings sublevel is not initialized');
    }
    return this._earningsDb;
  }

  // 实现 PersistentService 接口的方法
  query(_sql: string, _params: any[] = []): any[] {
    this.logger.debug(`LevelDB query called`);
    // 直接返回空数组，不进行 SQL 解析
    return [];
  }

  exec(_sql: string, _params: any[] = []): void {
    this.logger.debug(`LevelDB exec called`);
    // 在 LevelDB 中没有直接对应的操作，这里只是记录日志
  }

  get(_sql: string, _params: any[] = []): any {
    this.logger.debug(`LevelDB get called`);
    // 直接返回 null，不进行 SQL 解析
    return null;
  }

  run(_sql: string, _params: any[] = []): any {
    this.logger.debug(`LevelDB run called`);
    // 直接返回空对象，不进行 SQL 解析
    return {};
  }

  /**
   * 生成 UUID
   * 用于替代 PostgreSQL 的 gen_random_uuid() 函数
   */
  generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 获取当前时间戳
   * 用于替代 PostgreSQL 的 NOW() 函数
   */
  getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 保存设备状态
   * @param deviceStatus 设备状态对象
   */
  async saveDeviceStatus(deviceStatus: any): Promise<string> {
    if (!this._deviceStatusDb) {
      throw new Error('Device status database is not initialized');
    }

    // 确保有 ID
    if (!deviceStatus.id) {
      deviceStatus.id = this.generateUuid();
    }

    // 确保有创建和更新时间
    if (!deviceStatus.created_at) {
      deviceStatus.created_at = this.getCurrentTimestamp();
    }
    deviceStatus.updated_at = this.getCurrentTimestamp();

    // 保存到数据库
    await this._deviceStatusDb.put(deviceStatus.id, JSON.stringify(deviceStatus));

    return deviceStatus.id;
  }

  /**
   * 获取设备状态
   * @param id 设备 ID
   */
  async getDeviceStatus(id: string): Promise<any | null> {
    if (!this._deviceStatusDb) {
      throw new Error('Device status database is not initialized');
    }

    try {
      const data = await this._deviceStatusDb.get(id);
      return JSON.parse(data);
    } catch (error) {
      // 如果找不到记录，返回 null
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 保存任务
   * @param task 任务对象
   */
  async saveTask(task: any): Promise<string> {
    if (!this._tasksDb) {
      throw new Error('Tasks database is not initialized');
    }

    // 确保有 ID
    if (!task.id) {
      task.id = this.generateUuid();
    }

    // 确保有创建和更新时间
    if (!task.created_at) {
      task.created_at = this.getCurrentTimestamp();
    }
    task.updated_at = this.getCurrentTimestamp();

    // 保存到数据库
    await this._tasksDb.put(task.id, JSON.stringify(task));

    return task.id;
  }

  /**
   * 获取任务
   * @param id 任务 ID
   */
  async getTask(id: string): Promise<any | null> {
    if (!this._tasksDb) {
      throw new Error('Tasks database is not initialized');
    }

    try {
      const data = await this._tasksDb.get(id);
      return JSON.parse(data);
    } catch (error) {
      // 如果找不到记录，返回 null
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 保存收益记录
   * @param earning 收益对象
   */
  async saveEarning(earning: any): Promise<string> {
    if (!this._earningsDb) {
      throw new Error('Earnings database is not initialized');
    }

    // 确保有 ID
    if (!earning.id) {
      earning.id = this.generateUuid();
    }

    // 确保有创建和更新时间
    if (!earning.created_at) {
      earning.created_at = this.getCurrentTimestamp();
    }
    earning.updated_at = this.getCurrentTimestamp();

    // 保存到数据库
    await this._earningsDb.put(earning.id, JSON.stringify(earning));

    return earning.id;
  }

  /**
   * 获取收益记录
   * @param id 收益 ID
   */
  async getEarning(id: string): Promise<any | null> {
    if (!this._earningsDb) {
      throw new Error('Earnings database is not initialized');
    }

    try {
      const data = await this._earningsDb.get(id);
      return JSON.parse(data);
    } catch (error) {
      // 如果找不到记录，返回 null
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取设备的所有任务
   * @param deviceId 设备 ID
   */
  async getTasksByDeviceId(deviceId: string): Promise<any[]> {
    if (!this._tasksDb) {
      throw new Error('Tasks database is not initialized');
    }

    const tasks: any[] = [];

    // 遍历所有任务，找出属于该设备的任务
    for await (const [key, value] of this._tasksDb.iterator()) {
      if (key === '__schema__') continue; // 跳过 schema 记录

      try {
        const task = JSON.parse(value);
        if (task.device_id === deviceId) {
          tasks.push(task);
        }
      } catch (error) {
        this.logger.error(`Failed to parse task data: ${error}`);
      }
    }

    return tasks;
  }

  /**
   * 获取任务的所有收益记录
   * @param taskId 任务 ID
   */
  async getEarningsByTaskId(taskId: string): Promise<any[]> {
    if (!this._earningsDb) {
      throw new Error('Earnings database is not initialized');
    }

    const earnings: any[] = [];

    // 遍历所有收益记录，找出属于该任务的收益记录
    for await (const [key, value] of this._earningsDb.iterator()) {
      if (key === '__schema__') continue; // 跳过 schema 记录

      try {
        const earning = JSON.parse(value);
        if (earning.task_id === taskId) {
          earnings.push(earning);
        }
      } catch (error) {
        this.logger.error(`Failed to parse earning data: ${error}`);
      }
    }

    return earnings;
  }

  /**
   * 获取设备的所有收益记录
   * @param deviceId 设备 ID
   */
  async getEarningsByDeviceId(deviceId: string): Promise<any[]> {
    if (!this._earningsDb) {
      throw new Error('Earnings database is not initialized');
    }

    const earnings: any[] = [];

    // 遍历所有收益记录，找出属于该设备的收益记录
    for await (const [key, value] of this._earningsDb.iterator()) {
      if (key === '__schema__') continue; // 跳过 schema 记录

      try {
        const earning = JSON.parse(value);
        if (earning.device_id === deviceId) {
          earnings.push(earning);
        }
      } catch (error) {
        this.logger.error(`Failed to parse earning data: ${error}`);
      }
    }

    return earnings;
  }

  transaction<T>(callback: (db: any) => T): T {
    // LevelDB 没有内置的事务支持，但我们可以使用批处理操作模拟事务
    try {
      // 直接执行回调，传入 db 实例
      return callback(this.db);
    } catch (error) {
      this.logger.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * 批量保存数据
   * @param operations 批量操作数组
   */
  async batchOperations(operations: Array<{
    type: 'put' | 'del',
    table: 'device_status' | 'tasks' | 'earnings',
    key: string,
    value?: any
  }>): Promise<void> {
    // 按表分组操作
    const deviceStatusOps: any[] = [];
    const tasksOps: any[] = [];
    const earningsOps: any[] = [];

    for (const op of operations) {
      const { type, table, key, value } = op;

      if (type === 'put' && !value) {
        throw new Error(`Value is required for put operation on table ${table}`);
      }

      // 确保有创建和更新时间
      if (type === 'put') {
        if (!value.created_at) {
          value.created_at = this.getCurrentTimestamp();
        }
        value.updated_at = this.getCurrentTimestamp();

        // 确保有 ID
        if (!value.id) {
          value.id = key || this.generateUuid();
        }
      }

      const operation = {
        type,
        key,
        value: type === 'put' ? JSON.stringify(value) : undefined
      };

      switch (table) {
        case 'device_status':
          deviceStatusOps.push(operation);
          break;
        case 'tasks':
          tasksOps.push(operation);
          break;
        case 'earnings':
          earningsOps.push(operation);
          break;
        default:
          throw new Error(`Unknown table: ${table}`);
      }
    }

    // 执行批量操作
    const promises: Promise<void>[] = [];

    if (deviceStatusOps.length > 0 && this._deviceStatusDb) {
      promises.push(this._deviceStatusDb.batch(deviceStatusOps));
    }

    if (tasksOps.length > 0 && this._tasksDb) {
      promises.push(this._tasksDb.batch(tasksOps));
    }

    if (earningsOps.length > 0 && this._earningsDb) {
      promises.push(this._earningsDb.batch(earningsOps));
    }

    await Promise.all(promises);
  }

  /**
   * 获取所有设备状态
   */
  async getAllDeviceStatus(): Promise<any[]> {
    if (!this._deviceStatusDb) {
      throw new Error('Device status database is not initialized');
    }

    const devices: any[] = [];

    for await (const [key, value] of this._deviceStatusDb.iterator()) {
      if (key === '__schema__') continue; // 跳过 schema 记录

      try {
        const device = JSON.parse(value);
        devices.push(device);
      } catch (error) {
        this.logger.error(`Failed to parse device data: ${error}`);
      }
    }

    return devices;
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<any[]> {
    if (!this._tasksDb) {
      throw new Error('Tasks database is not initialized');
    }

    const tasks: any[] = [];

    for await (const [key, value] of this._tasksDb.iterator()) {
      if (key === '__schema__') continue; // 跳过 schema 记录

      try {
        const task = JSON.parse(value);
        tasks.push(task);
      } catch (error) {
        this.logger.error(`Failed to parse task data: ${error}`);
      }
    }

    return tasks;
  }

  // For backward compatibility with existing code
  get pgPool() {
    return {
      transaction: async <T>(callback: (connection: DatabaseTransactionConnection) => Promise<T>): Promise<T> => {
        // 创建一个代理对象，将 LevelDB 操作适配到预期的接口
        const connectionProxy = {
          query: async (_sql: any, _values?: any[]) => {
            this.logger.debug(`LevelDB query called`);
            const rows: any[] = [];
            return { rows };
          },

          one: async (_sql: any) => {
            this.logger.debug(`LevelDB one called`);
            return {};
          },

          maybeOne: async (_sql: any) => {
            this.logger.debug(`LevelDB maybeOne called`);
            return null;
          },

          any: async (_sql: any) => {
            this.logger.debug(`LevelDB any called`);
            return [];
          },

          many: async (_sql: any) => {
            this.logger.debug(`LevelDB many called`);
            return [];
          }
        };

        // 执行回调并返回结果
        return callback(connectionProxy as any);
      }
    };
  }

  async connectDatabase() {
    const dbPath = env().SQLITE_DATABASE_PATH;
    // 使用相同的路径，但是用于 LevelDB
    const levelDbPath = dbPath.replace('.db', '');

    // 确保目录存在
    const dbDir = path.dirname(levelDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.logger.log(`Connecting to LevelDB database at ${levelDbPath}`);

    try {
      // 打开主数据库
      this._db = new Level(levelDbPath, { valueEncoding: 'json' });

      // 等待数据库完全打开
      await this._db.open();

      // 创建子数据库 - 使用 any 类型避免类型错误
      this._deviceStatusDb = this._db.sublevel('device_status', { valueEncoding: 'json' }) as any;
      this._tasksDb = this._db.sublevel('tasks', { valueEncoding: 'json' }) as any;
      this._earningsDb = this._db.sublevel('earnings', { valueEncoding: 'json' }) as any;

      // 初始化数据库元数据
      await this.initializeDatabase();

      this.logger.log('LevelDB database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to LevelDB database:', error);
      throw error;
    }
  }

  /**
   * 初始化数据库，创建必要的子数据库和索引
   * 在 LevelDB 中，我们不需要创建表结构，但我们可以存储一些元数据信息
   */
  private async initializeDatabase() {
    try {
      if (!this._db || !this._deviceStatusDb || !this._tasksDb || !this._earningsDb) {
        throw new Error('Database is not initialized');
      }

      // 存储数据库版本和创建时间等元数据
      const metadata = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'LevelDB database for saito-miner'
      };
      await this._db.put('metadata', JSON.stringify(metadata));

      // 存储表结构元数据，这对于理解数据结构很有帮助

      // device_status 表结构
      const deviceStatusSchema = {
        name: 'device_status',
        fields: {
          id: { type: 'uuid', primaryKey: true },
          name: { type: 'text', required: true },
          status: { type: 'text', defaultValue: 'waiting', enum: ['waiting', 'in-progress', 'connected', 'disconnected', 'failed'] },
          up_time_start: { type: 'timestamp' },
          up_time_end: { type: 'timestamp' },
          reward_address: { type: 'text' },
          gateway_address: { type: 'text' },
          key: { type: 'text' },
          code: { type: 'text' },
          created_at: { type: 'timestamp', defaultValue: 'now()' },
          updated_at: { type: 'timestamp', defaultValue: 'now()' }
        }
      };
      await this._deviceStatusDb.put('__schema__', JSON.stringify(deviceStatusSchema));

      // tasks 表结构
      const tasksSchema = {
        name: 'tasks',
        fields: {
          id: { type: 'uuid', primaryKey: true },
          model: { type: 'text', required: true },
          created_at: { type: 'timestamp', defaultValue: 'now()' },
          status: { type: 'text', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
          total_duration: { type: 'double' },
          load_duration: { type: 'double' },
          prompt_eval_count: { type: 'integer' },
          prompt_eval_duration: { type: 'double' },
          eval_count: { type: 'integer' },
          eval_duration: { type: 'double' },
          updated_at: { type: 'timestamp', defaultValue: 'now()' },
          source: { type: 'text', defaultValue: 'local', enum: ['local', 'gateway'] },
          device_id: { type: 'uuid', foreignKey: { table: 'device_status', field: 'id' } }
        }
      };
      await this._tasksDb.put('__schema__', JSON.stringify(tasksSchema));

      // earnings 表结构
      const earningsSchema = {
        name: 'earnings',
        fields: {
          id: { type: 'uuid', primaryKey: true },
          block_rewards: { type: 'double', defaultValue: 0 },
          job_rewards: { type: 'double', defaultValue: 0 },
          created_at: { type: 'timestamp', defaultValue: 'now()' },
          updated_at: { type: 'timestamp', defaultValue: 'now()' },
          source: { type: 'text', defaultValue: 'local', enum: ['local', 'gateway'] },
          device_id: { type: 'uuid', foreignKey: { table: 'device_status', field: 'id' } },
          task_id: { type: 'uuid', foreignKey: { table: 'tasks', field: 'id' } }
        }
      };
      await this._earningsDb.put('__schema__', JSON.stringify(earningsSchema));

      this.logger.log('Database schema initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this._isClosing || this._db === null) {
      return;
    }

    this._isClosing = true;
    try {
      await this._db.close();
    } catch (error) {
      console.error('Error closing database connection:', error);
    } finally {
      this._db = null;
      this._deviceStatusDb = null;
      this._tasksDb = null;
      this._earningsDb = null;
      this._isClosing = false;
    }
  }
}

const PersistentServiceProvider = {
  provide: PersistentService,
  useFactory: async () => {
    const service = new DefaultPersistentService();
    await service.connectDatabase();
    return service;
  },
};

export default PersistentServiceProvider;
