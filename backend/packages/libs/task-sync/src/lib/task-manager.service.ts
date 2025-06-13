import { Injectable, Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { TTaskManager, TaskType, TASK_MANAGER_SERVICE } from "./task-sync.interface";

/**
 * 抽象任务管理器
 * 负责任务的 CRUD 操作和状态管理
 */
@Injectable()
export class TaskManagerService implements TTaskManager {
  private readonly logger = new Logger(TaskManagerService.name);

  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) {}

  /**
   * 安全解析 JSON
   */
  private safeJsonParse<T>(jsonString: any, errorContext: string): T | null {
    if (!jsonString) return null;
    
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.logger.error(`${errorContext}: ${error}`);
      return null;
    }
  }

  /**
   * 创建新任务
   */
  async createTask(task: TaskType): Promise<void> {
    try {
      const taskData = {
        ...task,
        source: 'gateway',
        created_at: task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || new Date().toISOString()
      };

      await this.persistentService.tasksDb.put(task.id, JSON.stringify(taskData));
      this.logger.debug(`Task created: ${task.id}`);
    } catch (error) {
      this.logger.error(`Failed to create task ${task.id}:`, error);
      throw error;
    }
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: Partial<TaskType>): Promise<void> {
    try {
      const existingData = await this.persistentService.tasksDb.get(taskId);
      const existingTask = this.safeJsonParse<TaskType>(existingData, `Parsing task ${taskId}`);
      
      if (!existingTask) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (existingTask.source !== 'gateway') {
        throw new Error(`Cannot update non-gateway task: ${taskId}`);
      }

      const updatedTask = {
        ...existingTask,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await this.persistentService.tasksDb.put(taskId, JSON.stringify(updatedTask));
      // this.logger.debug(`Task updated: ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to update task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * 查找任务
   */
  async findTask(taskId: string): Promise<TaskType | null> {
    try {
      const taskData = await this.persistentService.tasksDb.get(taskId);
      const task = this.safeJsonParse<TaskType>(taskData, `Finding task ${taskId}`);
      
      return task && task.source === 'gateway' ? task : null;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.logger.error(`Error finding task ${taskId}:`, error);
      return null;
    }
  }

  /**
   * 获取所有网关任务ID
   */
  async getAllTaskIds(): Promise<Set<string>> {
    const taskIds = new Set<string>();

    try {
      for await (const [key, value] of this.persistentService.tasksDb.iterator()) {
        if (key === '__schema__') continue;

        const task = this.safeJsonParse<TaskType>(value, `Parsing task ${key}`);
        if (task && task.source === 'gateway') {
          taskIds.add(task.id);
        }
      }
    } catch (error) {
      this.logger.error('Error getting all task IDs:', error);
    }

    return taskIds;
  }

  /**
   * 批量更新任务状态
   */
  async updateTaskStatuses(): Promise<void> {
    try {
      const operations = [];

      for await (const [key, value] of this.persistentService.tasksDb.iterator()) {
        if (key === '__schema__') continue;

        const task = this.safeJsonParse<TaskType>(value, `Parsing task ${key}`);
        
        if (task && (task.status as any) === 'succeed' && task.source === 'gateway') {
          const updatedTask = {
            ...task,
            status: 'completed',
            updated_at: new Date().toISOString()
          };

          operations.push({
            type: 'put' as const,
            key: task.id,
            value: JSON.stringify(updatedTask)
          });
        }
      }

      if (operations.length > 0) {
        await this.persistentService.tasksDb.batch(operations);
        this.logger.debug(`Updated ${operations.length} task statuses`);
      }
    } catch (error) {
      this.logger.error('Failed to update task statuses:', error);
      throw error;
    }
  }
}

const TaskManagerServiceProvider = {
  provide: TASK_MANAGER_SERVICE,
  useClass: TaskManagerService
};

export default TaskManagerServiceProvider;
