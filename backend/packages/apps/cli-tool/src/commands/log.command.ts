import { Command } from 'commander';
import { LogService } from '../services/log.service';
import { logManager } from '../utils/logger';

const logService = new LogService();

export const logCommand = new Command('logs')
  .alias('log')
  .description('📋 查看和管理日志')
  .action(async () => {
    // 记录 CLI 操作
    logManager.writeLog('cli', 'info', 'User accessed log management', 'LogCommand');
    
    try {
      await logService.showLogMenu();
    } catch (error: any) {
      logManager.writeLog('cli', 'error', `Log command failed: ${error.message}`, 'LogCommand');
      console.error('日志管理失败:', error.message);
      process.exit(1);
    }
  });

// 添加子命令
logCommand
  .command('view <type>')
  .description('直接查看指定类型的日志 (cli|backend|system)')
  .option('-n, --lines <number>', '显示行数', '50')
  .action(async (type: string, options: { lines: string }) => {
    logManager.writeLog('cli', 'info', `User viewed ${type} logs`, 'LogCommand');
    
    if (!['cli', 'backend', 'system'].includes(type)) {
      console.error('错误: 日志类型必须是 cli、backend 或 system');
      process.exit(1);
    }

    try {
      const lines = parseInt(options.lines);
      if (isNaN(lines) || lines <= 0) {
        console.error('错误: 行数必须是正整数');
        process.exit(1);
      }

      await logService.displayLogs(type as any, lines);
    } catch (error: any) {
      logManager.writeLog('cli', 'error', `Failed to view ${type} logs: ${error.message}`, 'LogCommand');
      console.error('查看日志失败:', error.message);
      process.exit(1);
    }
  });

logCommand
  .command('search <type> <query>')
  .description('搜索日志内容')
  .option('-n, --lines <number>', '搜索范围行数', '100')
  .action(async (type: string, query: string, options: { lines: string }) => {
    logManager.writeLog('cli', 'info', `User searched ${type} logs for: ${query}`, 'LogCommand');
    
    if (!['cli', 'backend', 'system'].includes(type)) {
      console.error('错误: 日志类型必须是 cli、backend 或 system');
      process.exit(1);
    }

    try {
      const lines = parseInt(options.lines);
      if (isNaN(lines) || lines <= 0) {
        console.error('错误: 行数必须是正整数');
        process.exit(1);
      }

      const results = logManager.searchLogs(type as any, query, lines);
      
      if (results.length === 0) {
        console.log(`没有找到包含 "${query}" 的日志`);
        return;
      }

      console.log(`\n🔍 搜索结果 (关键词: "${query}", ${results.length} 条):`);
      console.log('─'.repeat(80));

      results.forEach(log => {
        console.log(logManager.formatLogForDisplay(log));
      });

      console.log('─'.repeat(80));
    } catch (error: any) {
      logManager.writeLog('cli', 'error', `Failed to search ${type} logs: ${error.message}`, 'LogCommand');
      console.error('搜索日志失败:', error.message);
      process.exit(1);
    }
  });

logCommand
  .command('stats [type]')
  .description('显示日志统计信息')
  .action(async (type?: string) => {
    logManager.writeLog('cli', 'info', `User viewed log stats for: ${type || 'all'}`, 'LogCommand');
    
    try {
      if (type && !['cli', 'backend', 'system'].includes(type)) {
        console.error('错误: 日志类型必须是 cli、backend 或 system');
        process.exit(1);
      }

      if (type) {
        await logService.showLogStats(type as any);
      } else {
        // 显示所有类型的统计
        const types: ('cli' | 'backend' | 'system')[] = ['cli', 'backend', 'system'];
        
        console.log('\n📊 所有日志统计:');
        console.log('═'.repeat(50));
        
        for (const logType of types) {
          const stats = logManager.getLogStats(logType);
          const typeName = logType === 'cli' ? 'CLI' : 
                          logType === 'backend' ? '后台服务' : '系统';
          
          console.log(`\n${typeName}日志:`);
          console.log(`  总数: ${stats.total} 条`);
          console.log(`  错误: ${stats.errors} 条`);
          console.log(`  警告: ${stats.warnings} 条`);
          console.log(`  今日: ${stats.today} 条`);
        }
        
        console.log('\n═'.repeat(50));
      }
    } catch (error: any) {
      logManager.writeLog('cli', 'error', `Failed to show log stats: ${error.message}`, 'LogCommand');
      console.error('显示统计失败:', error.message);
      process.exit(1);
    }
  });

logCommand
  .command('clean')
  .description('清理旧日志文件')
  .action(async () => {
    logManager.writeLog('cli', 'info', 'User cleaned old logs', 'LogCommand');
    
    try {
      logManager.cleanOldLogs();
      console.log('✅ 旧日志清理完成');
    } catch (error: any) {
      logManager.writeLog('cli', 'error', `Failed to clean logs: ${error.message}`, 'LogCommand');
      console.error('清理日志失败:', error.message);
      process.exit(1);
    }
  });
