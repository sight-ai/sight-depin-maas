import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { AppConfigurationService } from './app/services/app-configuration.service';

/**
 * 增强的应用启动脚本
 * 
 * 集成了应用配置服务，提供：
 * 1. 启动前的环境检查
 * 2. 配置验证
 * 3. 框架可用性检测
 * 4. 健康检查
 * 5. 优雅的错误处理
 */

const logger = new Logger('Bootstrap');

/**
 * 启动应用
 */
export async function bootstrap(): Promise<void> {
  try {
    logger.log('Starting SightAI Backend Server...');

    // 创建 NestJS 应用
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // 启用 CORS
    app.enableCors({
      origin: true,
      credentials: true,
    });

    // 设置全局前缀
    app.setGlobalPrefix('api');

    // 获取应用配置服务
    const appConfigService = app.get(AppConfigurationService);

    // 等待应用初始化完成
    await waitForInitialization(appConfigService);

    // 执行启动前检查
    await performStartupChecks(appConfigService);

    // 启动服务器
    const port = process.env['PORT'] || 3000;
    await app.listen(port);

    logger.log(`🚀 SightAI Backend Server is running on: http://localhost:${port}`);
    
    // 显示应用状态
    await displayApplicationStatus(appConfigService);

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * 等待应用初始化完成
 */
async function waitForInitialization(
  appConfigService: AppConfigurationService,
  maxWaitTime = 30000
): Promise<void> {
  const startTime = Date.now();
  
  logger.log('Waiting for application initialization...');

  while (Date.now() - startTime < maxWaitTime) {
    const initResult = appConfigService.getInitializationResult();
    
    if (initResult) {
      if (initResult.success) {
        logger.log('✓ Application initialization completed successfully');
        return;
      } else {
        logger.warn('⚠ Application initialization completed with issues:');
        initResult.errors.forEach(error => logger.error(`  - ${error}`));
        initResult.warnings.forEach(warning => logger.warn(`  - ${warning}`));
        
        if (initResult.recommendations.length > 0) {
          logger.log('Recommendations:');
          initResult.recommendations.forEach(rec => logger.log(`  - ${rec}`));
        }
        return;
      }
    }

    // 等待 100ms 后重试
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Application initialization timeout');
}

/**
 * 执行启动前检查
 */
async function performStartupChecks(appConfigService: AppConfigurationService): Promise<void> {
  try {
    logger.log('Performing startup checks...');

    // 执行健康检查
    const healthCheck = await appConfigService.performHealthCheck();

    logger.log(`Overall health: ${healthCheck.overall.toUpperCase()}`);

    // 显示组件状态
    Object.entries(healthCheck.components).forEach(([component, status]) => {
      const icon = status.status === 'pass' ? '✓' : status.status === 'warning' ? '⚠' : '✗';
      const level = status.status === 'pass' ? 'log' : status.status === 'warning' ? 'warn' : 'error';
      logger[level](`${icon} ${component}: ${status.message}`);
    });

    // 显示建议
    if (healthCheck.recommendations.length > 0) {
      logger.log('Startup recommendations:');
      healthCheck.recommendations.forEach(rec => logger.log(`  - ${rec}`));
    }

    // 如果健康检查严重失败，记录警告但不阻止启动
    if (healthCheck.overall === 'critical') {
      logger.warn('⚠ Application has critical health issues but will continue to start');
      logger.warn('Some features may not work correctly until issues are resolved');
    }

  } catch (error) {
    logger.error('Startup checks failed:', error);
    logger.warn('Continuing with application startup despite check failures');
  }
}

/**
 * 显示应用状态
 */
async function displayApplicationStatus(appConfigService: AppConfigurationService): Promise<void> {
  try {
    const appStatus = await appConfigService.getAppStatus();

    logger.log('='.repeat(60));
    logger.log('APPLICATION STATUS');
    logger.log('='.repeat(60));
    
    logger.log(`Ready: ${appStatus.isReady ? '✓' : '✗'}`);
    logger.log(`Framework: ${appStatus.framework.type || 'None'} ${appStatus.framework.available ? '(Available)' : '(Unavailable)'}`);
    
    if (appStatus.framework.version) {
      logger.log(`Framework Version: ${appStatus.framework.version}`);
    }
    
    logger.log(`Available Models: ${appStatus.framework.models.length}`);
    logger.log(`Device Status: ${appStatus.device.status}`);
    logger.log(`Device Healthy: ${appStatus.device.healthy ? '✓' : '✗'}`);
    logger.log(`Configuration Valid: ${appStatus.configuration.valid ? '✓' : '✗'}`);

    if (!appStatus.configuration.valid) {
      logger.warn('Configuration errors:');
      appStatus.configuration.errors.forEach(error => logger.warn(`  - ${error}`));
    }

    logger.log('='.repeat(60));

    // 显示可用的 API 端点
    logger.log('Available API endpoints:');
    logger.log('  - GET  /api/app/status        - Application status');
    logger.log('  - GET  /api/app/health        - Health check');
    logger.log('  - GET  /api/app/config        - Configuration');
    logger.log('  - POST /api/app/switch-framework - Switch framework');
    logger.log('  - GET  /api/device-status     - Device status');
    logger.log('  - POST /api/openai/v1/chat/completions - Chat completions');
    logger.log('  - GET  /api/openai/v1/models  - Available models');

  } catch (error) {
    logger.error('Failed to display application status:', error);
  }
}

/**
 * 优雅关闭处理
 */
function setupGracefulShutdown(): void {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, shutting down gracefully...`);
      
      try {
        // 这里可以添加清理逻辑
        logger.log('Cleanup completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });
}

// 设置优雅关闭
setupGracefulShutdown();

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 如果直接运行此文件，启动应用
if (require.main === module) {
  bootstrap().catch(error => {
    logger.error('Bootstrap failed:', error);
    process.exit(1);
  });
}
