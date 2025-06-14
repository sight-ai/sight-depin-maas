import {
  ICliService,
  IDirectServiceAccess,
  IProcessManager,
  IUserInterface,
  IStorageManager,
  ICliHealth,
  ICommandExecutor,
  CommandResult,
  RegisterOptions,
  CliConfig
} from '../abstractions/cli.interfaces';
import { DirectServiceAccessorService } from './direct-service-accessor.service';
import { RefactoredProcessManagerService } from './refactored-process-manager.service';
import { UserInterfaceService } from './user-interface.service';
import { StorageManagerService } from './storage-manager.service';
import { CliHealthService } from './cli-health.service';
import { CommandExecutorService } from './command-executor.service';
import { DeviceCommandsHandler } from '../commands/refactored/device-commands.handler';
import { ModelCommandsHandler } from '../commands/refactored/model-commands.handler';
import { ProcessCommandsHandler } from '../commands/refactored/process-commands.handler';
import { FrameworkCommandsHandler } from '../commands/refactored/framework-commands.handler';
import { ModelConfigCommandsHandler } from '../commands/refactored/model-config-commands.handler';
import { ErrorHandlerService } from '@saito/common';

/**
 * CLI服务协调器 
 * 协调所有CLI服务组件，提供统一的服务接口，直接使用libs服务
 */
export class CliServiceOrchestrator implements ICliService {
  private readonly serviceAccess: IDirectServiceAccess;
  private readonly processManager: IProcessManager;
  private readonly ui: IUserInterface;
  private readonly storageManager: IStorageManager;
  private readonly healthService: ICliHealth;
  private readonly commandExecutor: ICommandExecutor;
  
  private readonly deviceHandler: DeviceCommandsHandler;
  private readonly modelHandler: ModelCommandsHandler;
  private readonly processHandler: ProcessCommandsHandler;
  private readonly frameworkHandler: FrameworkCommandsHandler;
  private readonly modelConfigHandler: ModelConfigCommandsHandler;

  private readonly errorHandler: ErrorHandlerService;

  constructor(config?: Partial<CliConfig>) {
    this.errorHandler = new ErrorHandlerService();

    // 初始化核心服务 - 依赖注入
    this.serviceAccess = new DirectServiceAccessorService();

    this.processManager = new RefactoredProcessManagerService(this.errorHandler);
    
    this.ui = new UserInterfaceService(
      config?.enableColors ?? true,
      config?.enableSpinners ?? true
    );
    
    this.storageManager = new StorageManagerService(
      this.errorHandler,
      config?.storagePath
    );
    
    this.healthService = new CliHealthService(
      this.serviceAccess,
      this.processManager,
      this.storageManager,
      this.errorHandler
    );

    this.commandExecutor = new CommandExecutorService(this.errorHandler);

    // 初始化命令处理器
    this.deviceHandler = new DeviceCommandsHandler(
      this.serviceAccess,
      this.ui,
      this.storageManager
    );

    this.modelHandler = new ModelCommandsHandler(
      this.serviceAccess,
      this.ui,
      this.storageManager,
      this.errorHandler
    );

    this.processHandler = new ProcessCommandsHandler(
      this.serviceAccess,
      this.ui,
      this.processManager,
      this.errorHandler
    );

    this.frameworkHandler = new FrameworkCommandsHandler(
      this.serviceAccess,
      this.ui,
      this.errorHandler
    );

    this.modelConfigHandler = new ModelConfigCommandsHandler(
      this.serviceAccess,
      this.ui,
      this.errorHandler
    );
  }

  // ===== ICommandExecutor 接口实现 =====
  
  async execute(command: string, args: string[]): Promise<CommandResult> {
    return this.commandExecutor.execute(command, args);
  }

  validateCommand(command: string): boolean {
    return this.commandExecutor.validateCommand(command);
  }

  getCommandHelp(command: string) {
    return this.commandExecutor.getCommandHelp(command);
  }

  listAvailableCommands() {
    return this.commandExecutor.listAvailableCommands();
  }

  // ===== IDirectServiceAccess 接口实现 =====

  async getModelService() {
    return this.serviceAccess.getModelService();
  }

  async getDeviceStatusService() {
    return this.serviceAccess.getDeviceStatusService();
  }

  async getMinerService() {
    return this.serviceAccess.getMinerService();
  }

  async getTaskSyncService() {
    return this.serviceAccess.getTaskSyncService();
  }

  async getModelReportingService() {
    return this.serviceAccess.getModelReportingService();
  }

  async getFrameworkManagerService() {
    return this.serviceAccess.getFrameworkManagerService();
  }

  async getFrameworkSwitchService() {
    return this.serviceAccess.getFrameworkSwitchService();
  }

  async getDynamicModelConfigService() {
    return this.serviceAccess.getDynamicModelConfigService();
  }

  async checkServicesHealth() {
    return this.serviceAccess.checkServicesHealth();
  }

  // ===== IProcessManager 接口实现 =====
  
  async startDaemon() {
    return this.processManager.startDaemon();
  }

  async stopDaemon() {
    return this.processManager.stopDaemon();
  }

  async getStatus() {
    return this.processManager.getStatus();
  }

  async isRunning() {
    return this.processManager.isRunning();
  }

  async restart() {
    return this.processManager.restart();
  }

  async kill(signal?: string) {
    return this.processManager.kill(signal);
  }

  // ===== IUserInterface 接口实现 =====
  
  showMessage(message: string, type: any): void {
    this.ui.showMessage(message, type);
  }

  showTable(data: any): void {
    this.ui.showTable(data);
  }

  showSpinner(text: string) {
    return this.ui.showSpinner(text);
  }

  async prompt(questions: any[]) {
    return this.ui.prompt(questions);
  }

  showBox(title: string, content: string, type: any): void {
    this.ui.showBox(title, content, type);
  }

  clear(): void {
    this.ui.clear();
  }

  showKeyValue(key: string, value: string): void {
    this.ui.showKeyValue(key, value);
  }

  showSubtitle(subtitle: string): void {
    this.ui.showSubtitle(subtitle);
  }

  showTitle(title: string): void {
    this.ui.showTitle(title);
  }

  async select(message: string, choices: Array<string | { name: string; value: any }>): Promise<any> {
    return this.ui.select(message, choices);
  }

  async input(message: string, defaultValue?: string): Promise<string> {
    return this.ui.input(message, defaultValue);
  }

  async confirm(message: string, defaultValue?: boolean): Promise<boolean> {
    return this.ui.confirm(message, defaultValue);
  }

  success(message: string): void {
    this.ui.success(message);
  }

  error(message: string): void {
    this.ui.error(message);
  }

  warning(message: string): void {
    this.ui.warning(message);
  }

  info(message: string): void {
    this.ui.info(message);
  }

  showList(items: string[]): void {
    this.ui.showList(items);
  }

  // ===== IStorageManager 接口实现 =====
  
  async saveRegistration(info: any) {
    return this.storageManager.saveRegistration(info);
  }

  async loadRegistration() {
    return this.storageManager.loadRegistration();
  }

  async clearRegistration() {
    return this.storageManager.clearRegistration();
  }

  async saveModelReport(report: any) {
    return this.storageManager.saveModelReport(report);
  }

  async loadModelReport() {
    return this.storageManager.loadModelReport();
  }

  getStoragePath(): string {
    return this.storageManager.getStoragePath();
  }

  async ensureStorageExists() {
    return this.storageManager.ensureStorageExists();
  }

  async getStorageStats() {
    return this.storageManager.getStorageStats();
  }

  async getReportedModels() {
    return this.storageManager.getReportedModels();
  }

  // ===== ICliHealth 接口实现 =====

  async checkHealth() {
    return this.healthService.checkHealth();
  }



  // ===== IConfigManager 接口实现 =====
  
  async get<T>(key: string): Promise<T | null> {
    // 简单实现，可以扩展为真正的配置管理
    return null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    // 简单实现，可以扩展为真正的配置管理
  }

  async has(key: string): Promise<boolean> {
    return false;
  }

  async delete(key: string): Promise<void> {
    // 简单实现
  }

  async getAll(): Promise<Record<string, any>> {
    return {};
  }

  async save(): Promise<void> {
    // 简单实现
  }

  async load(): Promise<void> {
    // 简单实现
  }

  // ===== ICliHealth 接口实现 =====
  
  async checkApiConnection() {
    return this.healthService.checkApiConnection();
  }

  async checkProcessStatus() {
    return this.healthService.checkProcessStatus();
  }

  async checkStorageAccess() {
    return this.healthService.checkStorageAccess();
  }

  async performDiagnostics() {
    return this.healthService.performDiagnostics();
  }

  // ===== 向后兼容的高级方法 =====
  
  async register(options: RegisterOptions): Promise<CommandResult> {
    return this.deviceHandler.handleRegister(options);
  }

  async unregister(): Promise<CommandResult> {
    return this.deviceHandler.handleUnregister();
  }

  async getDeviceStatus(): Promise<CommandResult> {
    return this.deviceHandler.handleStatus();
  }

  async listModels(): Promise<CommandResult> {
    return this.modelHandler.handleListModels();
  }

  async reportModels(models: string[]): Promise<CommandResult> {
    return this.modelHandler.handleReportModels(models);
  }

  // ===== 扩展方法 =====
  
  /**
   * 启动服务器
   */
  async startServer(daemon: boolean = false, port: string = '8716'): Promise<CommandResult> {
    return this.processHandler.handleStart(daemon, port);
  }

  /**
   * 停止服务器
   */
  async stopServer(): Promise<CommandResult> {
    return this.processHandler.handleStop();
  }

  /**
   * 重启服务器
   */
  async restartServer(): Promise<CommandResult> {
    return this.processHandler.handleRestart();
  }

  /**
   * 获取服务器状态
   */
  async getServerStatus(): Promise<CommandResult> {
    return this.processHandler.handleProcessStatus();
  }

  /**
   * 查看日志
   */
  async viewLogs(lines: number = 50, follow: boolean = false): Promise<CommandResult> {
    return this.processHandler.handleLogs(lines, follow);
  }

  /**
   * 执行完整的健康检查
   */
  async performFullHealthCheck(): Promise<CommandResult> {
    try {
      const [health, diagnostics] = await Promise.all([
        this.healthService.checkHealth(),
        this.healthService.performDiagnostics()
      ]);

      return {
        success: health.status !== 'unhealthy',
        data: { health, diagnostics },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取所有服务的状态
   */
  async getAllServicesStatus(): Promise<CommandResult> {
    try {
      const [servicesHealth, processStatus, storageStats, health] = await Promise.allSettled([
        this.serviceAccess.checkServicesHealth(),
        this.processManager.getStatus(),
        this.storageManager.getStorageStats(),
        this.healthService.checkHealth()
      ]);

      const status = {
        services: servicesHealth.status === 'fulfilled' ? servicesHealth.value : null,
        process: processStatus.status === 'fulfilled' ? processStatus.value : null,
        storage: storageStats.status === 'fulfilled' ? storageStats.value : null,
        overall: health.status === 'fulfilled' ? health.value : null
      };

      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get services status',
        code: 'SERVICES_STATUS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===== 框架管理方法 =====

  /**
   * 获取框架状态
   */
  async getFrameworkStatus(): Promise<CommandResult> {
    return this.frameworkHandler.handleFrameworkStatus();
  }

  /**
   * 切换框架
   */
  async switchFramework(framework: string, force: boolean = false): Promise<CommandResult> {
    return this.frameworkHandler.handleFrameworkSwitch(framework, force);
  }

  /**
   * 获取统一模型列表
   */
  async getUnifiedModels(framework?: string): Promise<CommandResult> {
    return this.frameworkHandler.handleUnifiedModels(framework);
  }

  /**
   * 获取统一健康状态
   */
  async getUnifiedHealth(): Promise<CommandResult> {
    return this.frameworkHandler.handleUnifiedHealth();
  }

  /**
   * 获取统一版本信息
   */
  async getUnifiedVersion(framework?: string): Promise<CommandResult> {
    return this.frameworkHandler.handleUnifiedVersion(framework);
  }

  // ===== 模型配置方法 =====

  /**
   * 获取默认模型
   */
  async getDefaultModel(framework?: string): Promise<CommandResult> {
    return this.modelConfigHandler.handleGetDefaultModel(framework);
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(framework?: string): Promise<CommandResult> {
    return this.modelConfigHandler.handleGetAvailableModels(framework);
  }

  /**
   * 获取模型统计信息
   */
  async getModelStats(): Promise<CommandResult> {
    return this.modelConfigHandler.handleGetModelStats();
  }

  /**
   * 刷新模型缓存
   */
  async refreshModels(framework?: string): Promise<CommandResult> {
    return this.modelConfigHandler.handleRefreshModels(framework);
  }

  /**
   * 清除模型缓存
   */
  async clearModelCache(): Promise<CommandResult> {
    return this.modelConfigHandler.handleClearCache();
  }
}
