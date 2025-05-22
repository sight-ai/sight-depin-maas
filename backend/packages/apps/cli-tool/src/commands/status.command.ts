import { Command } from 'commander';
import { select, input } from '@inquirer/prompts';
import { CliUI } from '../utils/cli-ui';
import { StatusService } from '../services/status.service';
import { logManager } from '../utils/logger';
import { configManager } from '../utils/config';

const ui = new CliUI();
const statusService = new StatusService();

export const statusCommand = new Command('status')
  .alias('stat')
  .description('📊 运行状态监控')
  .action(async () => {
    logManager.writeLog('cli', 'info', 'User accessed status monitoring', 'StatusCommand');
    try {
      ui.showTitle('📊 运行状态监控');

      const action = await select({
        message: '选择操作：',
        choices: [
          { name: '📈 查看当前状态', value: 'current' },
          { name: '🔄 实时监控', value: 'monitor' },
          { name: '🖥️ 系统信息', value: 'system' },
          { name: '🔧 服务状态', value: 'services' },
          { name: '⛏️ 矿工状态', value: 'miner' },
          { name: '🚪 返回', value: 'exit' }
        ]
      });

      switch (action) {
        case 'current':
          await handleCurrentStatus();
          break;
        case 'monitor':
          await handleRealTimeMonitor();
          break;
        case 'system':
          await handleSystemInfo();
          break;
        case 'services':
          await handleServiceStatus();
          break;
        case 'miner':
          await handleMinerStatus();
          break;
        case 'exit':
          ui.info('操作已取消');
          break;
      }

    } catch (error: any) {
      if (error.name === 'ExitPromptError') {
        ui.info('操作已取消');
      } else {
        ui.error(`状态监控过程中发生错误: ${error.message}`);
      }
    }
  });

// 查看当前状态
async function handleCurrentStatus() {
  ui.showTitle('📈 当前系统状态');

  ui.startSpinner('获取状态信息...');

  try {
    const [systemStatus, serviceStatus, minerStatus] = await Promise.all([
      statusService.getSystemStatus(),
      statusService.getServiceStatus(),
      statusService.getMinerStatus()
    ]);

    ui.stopSpinner(true, '状态信息获取成功');

    // 显示服务状态
    ui.showStatusBox('🔧 服务状态', [
      {
        label: '后端服务',
        value: serviceStatus.backend ? '运行中' : '已停止',
        status: serviceStatus.backend ? 'success' : 'error'
      },
      {
        label: 'Ollama 服务',
        value: serviceStatus.ollama ? '运行中' : '已停止',
        status: serviceStatus.ollama ? 'success' : 'error'
      },
      {
        label: '网关连接',
        value: serviceStatus.gateway ? '已连接' : '未连接',
        status: serviceStatus.gateway ? 'success' : 'warning'
      }
    ]);

    // 显示系统资源
    ui.showStatusBox('💻 系统资源', [
      {
        label: 'CPU 使用率',
        value: `${systemStatus.cpu.usage}%`,
        status: statusService.getStatusColor(systemStatus.cpu.usage, { warning: 70, critical: 90 })
      },
      {
        label: 'CPU 型号',
        value: systemStatus.cpu.model
      },
      {
        label: '内存使用率',
        value: `${systemStatus.memory.usage}% (${statusService.formatBytes(systemStatus.memory.used)}/${statusService.formatBytes(systemStatus.memory.total)})`,
        status: statusService.getStatusColor(systemStatus.memory.usage, { warning: 80, critical: 95 })
      },
      {
        label: '磁盘使用率',
        value: `${systemStatus.disk.usage}% (${statusService.formatBytes(systemStatus.disk.used)}/${statusService.formatBytes(systemStatus.disk.total)})`,
        status: statusService.getStatusColor(systemStatus.disk.usage, { warning: 80, critical: 95 })
      }
    ]);

    // 显示 GPU 信息
    if (systemStatus.gpu.length > 0) {
      ui.showStatusBox('🎮 GPU 信息', systemStatus.gpu.map((gpu, index) => ({
        label: `GPU ${index + 1}`,
        value: `${gpu.model} ${gpu.memory ? `(${statusService.formatBytes(gpu.memory)})` : ''}`
      })));
    }

    // 显示矿工状态
    if (minerStatus) {
      ui.showStatusBox('⛏️ 矿工状态', [
        {
          label: '设备状态',
          value: minerStatus.status,
          status: minerStatus.status === 'connected' ? 'success' : 'warning'
        },
        {
          label: '设备 ID',
          value: minerStatus.deviceId.substring(0, 8) + '...'
        },
        {
          label: '完成任务',
          value: `${minerStatus.tasksCompleted || 0} 个`
        },
        {
          label: '累计收益',
          value: `${minerStatus.earnings || 0} SAITO`
        }
      ]);
    } else if (configManager.hasRegistrationInfo()) {
      ui.warning('矿工状态信息不可用');
    } else {
      ui.info('设备尚未注册到网关');
    }

  } catch (error: any) {
    ui.stopSpinner(false, `获取状态失败: ${error.message}`);
  }
}

// 实时监控
async function handleRealTimeMonitor() {
  ui.showTitle('🔄 实时监控设置');

  const intervalInput = await input({
    message: '监控更新间隔（秒）:',
    default: '5',
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 60) {
        return '请输入 1-60 之间的数字';
      }
      return true;
    }
  });

  const interval = parseInt(intervalInput);

  ui.info('启动实时监控...');
  ui.info('提示：按 Ctrl+C 可以停止监控');

  await ui.waitForKey('按任意键开始监控...');

  await statusService.startMonitoring(interval);
}

// 系统信息
async function handleSystemInfo() {
  ui.showTitle('🖥️ 详细系统信息');

  ui.startSpinner('获取系统信息...');

  try {
    const systemStatus = await statusService.getSystemStatus();
    ui.stopSpinner(true, '系统信息获取成功');

    // CPU 详细信息
    ui.showStatusBox('🔧 CPU 信息', [
      { label: '型号', value: systemStatus.cpu.model },
      { label: '核心数', value: `${systemStatus.cpu.cores} 核` },
      { label: '当前使用率', value: `${systemStatus.cpu.usage}%` },
      { label: '温度', value: systemStatus.cpu.temperature ? `${systemStatus.cpu.temperature}°C` : '不可用' }
    ]);

    // 内存详细信息
    ui.showStatusBox('💾 内存信息', [
      { label: '总内存', value: statusService.formatBytes(systemStatus.memory.total) },
      { label: '已使用', value: statusService.formatBytes(systemStatus.memory.used) },
      { label: '可用内存', value: statusService.formatBytes(systemStatus.memory.free) },
      { label: '使用率', value: `${systemStatus.memory.usage}%` }
    ]);

    // GPU 详细信息
    if (systemStatus.gpu.length > 0) {
      systemStatus.gpu.forEach((gpu, index) => {
        ui.showStatusBox(`🎮 GPU ${index + 1} 信息`, [
          { label: '型号', value: gpu.model },
          { label: '显存', value: gpu.memory ? statusService.formatBytes(gpu.memory) : '不可用' },
          { label: '温度', value: gpu.temperature ? `${gpu.temperature}°C` : '不可用' },
          { label: '使用率', value: gpu.usage ? `${gpu.usage}%` : '不可用' }
        ]);
      });
    } else {
      ui.warning('未检测到 GPU 设备');
    }

    // 磁盘信息
    ui.showStatusBox('💿 磁盘信息', [
      { label: '总容量', value: statusService.formatBytes(systemStatus.disk.total) },
      { label: '已使用', value: statusService.formatBytes(systemStatus.disk.used) },
      { label: '可用空间', value: statusService.formatBytes(systemStatus.disk.free) },
      { label: '使用率', value: `${systemStatus.disk.usage}%` }
    ]);

    // 网络信息
    if (systemStatus.network.length > 0) {
      const headers = ['网络接口', '接收流量', '发送流量'];
      const rows = systemStatus.network.map(iface => [
        iface.interface,
        statusService.formatBytes(iface.rx),
        statusService.formatBytes(iface.tx)
      ]);

      console.log('\n🌐 网络接口信息:');
      console.log(ui.createTable(headers, rows));
    }

  } catch (error: any) {
    ui.stopSpinner(false, `获取系统信息失败: ${error.message}`);
  }
}

// 服务状态
async function handleServiceStatus() {
  ui.showTitle('🔧 服务状态检查');

  ui.startSpinner('检查服务状态...');

  try {
    const serviceStatus = await statusService.getServiceStatus();
    ui.stopSpinner(true, '服务状态检查完成');

    ui.showStatusBox('🔧 服务运行状态', [
      {
        label: 'SightAI 后端服务',
        value: serviceStatus.backend ? '✅ 运行中 (端口 8716)' : '❌ 未运行',
        status: serviceStatus.backend ? 'success' : 'error'
      },
      {
        label: 'Ollama AI 服务',
        value: serviceStatus.ollama ? '✅ 运行中 (端口 11434)' : '❌ 未运行',
        status: serviceStatus.ollama ? 'success' : 'error'
      },
      {
        label: '网关连接状态',
        value: serviceStatus.gateway ? '✅ 已连接' : '❌ 未连接',
        status: serviceStatus.gateway ? 'success' : 'warning'
      }
    ]);

    // 提供故障排除建议
    if (!serviceStatus.backend) {
      ui.error('后端服务未运行');
      ui.info('解决方案：');
      ui.info('1. 检查 SightAI 应用是否已启动');
      ui.info('2. 确认端口 8716 未被占用');
      ui.info('3. 重启 SightAI 应用');
    }

    if (!serviceStatus.ollama) {
      ui.error('Ollama 服务未运行');
      ui.info('解决方案：');
      ui.info('1. 安装 Ollama: https://ollama.ai/download');
      ui.info('2. 启动 Ollama 服务');
      ui.info('3. 确认端口 11434 未被占用');
    }

    if (!serviceStatus.gateway && configManager.hasRegistrationInfo()) {
      ui.warning('网关连接断开');
      ui.info('解决方案：');
      ui.info('1. 检查网络连接');
      ui.info('2. 使用 sight-cli register 重新注册');
      ui.info('3. 确认网关服务器可访问');
    }

  } catch (error: any) {
    ui.stopSpinner(false, `检查服务状态失败: ${error.message}`);
  }
}

// 矿工状态
async function handleMinerStatus() {
  ui.showTitle('⛏️ 矿工状态详情');

  if (!configManager.hasRegistrationInfo()) {
    ui.warning('设备尚未注册到网关');
    ui.info('请先使用 sight-cli register 命令注册设备');
    return;
  }

  ui.startSpinner('获取矿工状态...');

  try {
    const minerStatus = await statusService.getMinerStatus();
    ui.stopSpinner(true, '矿工状态获取成功');

    if (minerStatus) {
      ui.showStatusBox('⛏️ 矿工详细状态', [
        {
          label: '设备状态',
          value: minerStatus.status,
          status: minerStatus.status === 'connected' ? 'success' : 'warning'
        },
        {
          label: '完整设备 ID',
          value: minerStatus.deviceId
        },
        {
          label: '最后心跳时间',
          value: minerStatus.lastHeartbeat || '未知'
        },
        {
          label: '运行时长',
          value: minerStatus.uptime ? statusService.formatUptime(minerStatus.uptime) : '未知'
        },
        {
          label: '完成任务数',
          value: `${minerStatus.tasksCompleted || 0} 个`
        },
        {
          label: '累计收益',
          value: `${minerStatus.earnings || 0} SAITO`
        }
      ]);

      // 显示注册信息
      const registrationInfo = configManager.getRegistrationInfo()!;
      ui.showStatusBox('📋 注册信息', [
        { label: '网关地址', value: registrationInfo.gatewayUrl },
        { label: '奖励地址', value: registrationInfo.rewardAddress },
        { label: '注册时间', value: configManager.get('lastRegistration') || '未知' }
      ]);

    } else {
      ui.error('无法获取矿工状态');
      ui.info('可能的原因：');
      ui.info('1. 后端服务未运行');
      ui.info('2. 设备未正确注册');
      ui.info('3. 网关连接问题');
    }

  } catch (error: any) {
    ui.stopSpinner(false, `获取矿工状态失败: ${error.message}`);
  }
}
