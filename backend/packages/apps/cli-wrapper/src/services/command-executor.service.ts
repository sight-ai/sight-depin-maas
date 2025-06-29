import { 
  ICommandExecutor, 
  CommandResult, 
  CommandHelp, 
  CommandInfo, 
  CommandCategory,
  CliError 
} from '../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * 命令执行器服务 
 * 只负责命令的验证、执行和帮助信息管理
 */
export class CommandExecutorService implements ICommandExecutor {
  private readonly commands: Map<string, CommandDefinition> = new Map();

  constructor(
    private readonly errorHandler: ErrorHandlerService = new ErrorHandlerService()
  ) {
    this.initializeCommands();
  }

  /**
   * 执行命令
   */
  async execute(command: string, args: string[]): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      if (!this.validateCommand(command)) {
        return {
          success: false,
          error: `Unknown command: ${command}`,
          code: 'UNKNOWN_COMMAND',
          timestamp: new Date().toISOString()
        };
      }

      const commandDef = this.commands.get(command);
      if (!commandDef) {
        return {
          success: false,
          error: `Command definition not found: ${command}`,
          code: 'COMMAND_NOT_FOUND',
          timestamp: new Date().toISOString()
        };
      }

      // 验证参数
      const validationResult = this.validateArgs(commandDef, args);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          code: 'INVALID_ARGUMENTS',
          timestamp: new Date().toISOString()
        };
      }

      // 执行命令
      const result = await commandDef.handler(args);
      const duration = Date.now() - startTime;

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof CliError ? error.code : 'EXECUTION_ERROR',
        timestamp: new Date().toISOString(),
        duration
      };
    }
  }

  /**
   * 验证命令
   */
  validateCommand(command: string): boolean {
    return this.commands.has(command);
  }

  /**
   * 获取命令帮助
   */
  getCommandHelp(command: string): CommandHelp {
    const commandDef = this.commands.get(command);
    
    if (!commandDef) {
      throw new CliError(`Command not found: ${command}`, 'COMMAND_NOT_FOUND');
    }

    return {
      command: commandDef.name,
      description: commandDef.description,
      usage: commandDef.usage,
      options: commandDef.options || [],
      examples: commandDef.examples || []
    };
  }

  /**
   * 列出可用命令
   */
  listAvailableCommands(): CommandInfo[] {
    return Array.from(this.commands.values()).map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      category: cmd.category,
      aliases: cmd.aliases
    }));
  }

  /**
   * 注册命令
   */
  registerCommand(definition: CommandDefinition): void {
    this.commands.set(definition.name, definition);
    
    // 注册别名
    if (definition.aliases) {
      definition.aliases.forEach(alias => {
        this.commands.set(alias, definition);
      });
    }
  }

  /**
   * 获取命令按类别分组
   */
  getCommandsByCategory(): Record<string, CommandInfo[]> {
    const commands = this.listAvailableCommands();
    const grouped: Record<string, CommandInfo[]> = {};

    commands.forEach(cmd => {
      if (!grouped[cmd.category]) {
        grouped[cmd.category] = [];
      }
      
      // 避免重复添加（别名会导致重复）
      if (!grouped[cmd.category].find(c => c.name === cmd.name)) {
        grouped[cmd.category].push(cmd);
      }
    });

    return grouped;
  }

  /**
   * 搜索命令
   */
  searchCommands(query: string): CommandInfo[] {
    const commands = this.listAvailableCommands();
    const lowerQuery = query.toLowerCase();

    return commands.filter(cmd => 
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery) ||
      (cmd.aliases && cmd.aliases.some(alias => alias.toLowerCase().includes(lowerQuery)))
    );
  }

  /**
   * 初始化命令
   */
  private initializeCommands(): void {
    // 设备相关命令
    this.registerCommand({
      name: 'register',
      description: 'Register device with gateway',
      category: CommandCategory.DEVICE,
      usage: 'register [options]',
      options: [
        { flag: '--code <code>', description: 'Registration code', required: false },
        { flag: '--gateway <url>', description: 'Gateway address', required: false },
        { flag: '--reward <address>', description: 'Reward address', required: false }
      ],
      examples: [
        'register --code ABC123 --gateway http://gateway.example.com --reward 0x123...',
        'register (interactive mode)'
      ],
      handler: async (args) => {
        // 这里会调用实际的注册逻辑
        throw new CliError('Register command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    this.registerCommand({
      name: 'unregister',
      description: 'Unregister device from gateway',
      category: CommandCategory.DEVICE,
      usage: 'unregister',
      examples: ['unregister'],
      handler: async (args) => {
        throw new CliError('Unregister command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    this.registerCommand({
      name: 'status',
      description: 'Show device status',
      category: CommandCategory.DEVICE,
      usage: 'status',
      aliases: ['st'],
      examples: ['status', 'st'],
      handler: async (args) => {
        throw new CliError('Status command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    // 模型相关命令
    this.registerCommand({
      name: 'models',
      description: 'List available models',
      category: CommandCategory.MODEL,
      usage: 'models [options]',
      options: [
        { flag: '--format <format>', description: 'Output format (table|json)', default: 'table' }
      ],
      examples: ['models', 'models --format json'],
      handler: async (args) => {
        throw new CliError('Models command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    this.registerCommand({
      name: 'report',
      description: 'Report models to gateway',
      category: CommandCategory.MODEL,
      usage: 'report [models...]',
      options: [
        { flag: '--all', description: 'Report all available models' }
      ],
      examples: ['report model1 model2', 'report --all'],
      handler: async (args) => {
        throw new CliError('Report command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    // 进程相关命令
    this.registerCommand({
      name: 'start',
      description: 'Start backend server',
      category: CommandCategory.PROCESS,
      usage: 'start [options]',
      options: [
        { flag: '--daemon', description: 'Run as daemon process' },
        { flag: '--port <port>', description: 'Server port', default: '8716' }
      ],
      examples: ['start', 'start --daemon', 'start --port 8080'],
      handler: async (args) => {
        throw new CliError('Start command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    this.registerCommand({
      name: 'stop',
      description: 'Stop backend server',
      category: CommandCategory.PROCESS,
      usage: 'stop',
      examples: ['stop'],
      handler: async (args) => {
        throw new CliError('Stop command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    this.registerCommand({
      name: 'restart',
      description: 'Restart backend server',
      category: CommandCategory.PROCESS,
      usage: 'restart',
      examples: ['restart'],
      handler: async (args) => {
        throw new CliError('Restart command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    // 框架相关命令
    this.registerCommand({
      name: 'framework',
      description: 'Manage inference frameworks',
      category: CommandCategory.FRAMEWORK,
      usage: 'framework <action> [options]',
      options: [
        { flag: 'start <framework>', description: 'Start framework (ollama|vllm)' },
        { flag: 'stop <framework>', description: 'Stop framework' },
        { flag: 'switch <framework>', description: 'Switch to framework' },
        { flag: 'status', description: 'Show framework status' }
      ],
      examples: [
        'framework start ollama',
        'framework stop vllm',
        'framework switch ollama',
        'framework status'
      ],
      handler: async (args) => {
        throw new CliError('Framework command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    // 系统相关命令
    this.registerCommand({
      name: 'logs',
      description: 'Show application logs',
      category: CommandCategory.SYSTEM,
      usage: 'logs [options]',
      options: [
        { flag: '--lines <n>', description: 'Number of lines to show', default: '50' },
        { flag: '--follow', description: 'Follow log output' }
      ],
      examples: ['logs', 'logs --lines 100', 'logs --follow'],
      handler: async (args) => {
        throw new CliError('Logs command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    this.registerCommand({
      name: 'health',
      description: 'Check system health',
      category: CommandCategory.SYSTEM,
      usage: 'health',
      examples: ['health'],
      handler: async (args) => {
        throw new CliError('Health command not implemented', 'NOT_IMPLEMENTED');
      }
    });

    this.registerCommand({
      name: 'help',
      description: 'Show help information',
      category: CommandCategory.SYSTEM,
      usage: 'help [command]',
      examples: ['help', 'help register', 'help models'],
      handler: async (args) => {
        throw new CliError('Help command not implemented', 'NOT_IMPLEMENTED');
      }
    });
  }

  /**
   * 验证参数
   */
  private validateArgs(commandDef: CommandDefinition, args: string[]): { valid: boolean; error?: string } {
    // 这里可以添加更复杂的参数验证逻辑
    // 目前只做基本验证
    
    if (commandDef.options) {
      const requiredOptions = commandDef.options.filter(opt => opt.required);
      
      for (const option of requiredOptions) {
        const flag = option.flag.split(' ')[0]; // 获取标志名
        if (!args.includes(flag)) {
          return {
            valid: false,
            error: `Required option missing: ${flag}`
          };
        }
      }
    }

    return { valid: true };
  }
}

/**
 * 命令定义接口
 */
interface CommandDefinition {
  name: string;
  description: string;
  category: CommandCategory;
  usage: string;
  aliases?: string[];
  options?: Array<{
    flag: string;
    description: string;
    required?: boolean;
    default?: any;
  }>;
  examples?: string[];
  handler: (args: string[]) => Promise<any>;
}
