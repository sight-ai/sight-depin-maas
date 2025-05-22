import { Command } from 'commander';
import { input, confirm, select } from '@inquirer/prompts';
import { CliUI } from '../utils/cli-ui';
import { configManager } from '../utils/config';
import { GatewayService } from '../services/gateway.service';
import { logManager } from '../utils/logger';

const ui = new CliUI();
const gatewayService = new GatewayService();

export const registerCommand = new Command('register')
  .alias('reg')
  .description('🔗 网关注册管理')
  .action(async () => {
    logManager.writeLog('cli', 'info', 'User accessed gateway registration management', 'RegisterCommand');
    try {
      ui.showTitle('🔗 网关注册管理');

      // 检查是否已有注册信息
      const hasRegistration = configManager.hasRegistrationInfo();

      if (hasRegistration) {
        const registrationInfo = configManager.getRegistrationInfo()!;

        ui.showStatusBox('📋 当前注册信息', [
          { label: '网关 URL', value: registrationInfo.gatewayUrl },
          { label: '节点代码', value: registrationInfo.nodeCode },
          { label: '奖励地址', value: registrationInfo.rewardAddress },
          { label: '上次注册', value: configManager.get('lastRegistration') || '未知' }
        ]);

        const action = await select({
          message: '选择操作：',
          choices: [
            { name: '🔄 重新注册（使用现有信息）', value: 'reregister' },
            { name: '✏️ 修改注册信息', value: 'modify' },
            { name: '🗑️ 清除注册信息', value: 'clear' },
            { name: '📊 查看注册状态', value: 'status' },
            { name: '🚪 返回', value: 'exit' }
          ]
        });

        switch (action) {
          case 'reregister':
            logManager.writeLog('cli', 'info', 'User initiated device re-registration', 'RegisterCommand');
            await handleReRegister();
            break;
          case 'modify':
            logManager.writeLog('cli', 'info', 'User initiated registration modification', 'RegisterCommand');
            await handleNewRegistration();
            break;
          case 'clear':
            logManager.writeLog('cli', 'info', 'User initiated registration clearing', 'RegisterCommand');
            await handleClearRegistration();
            break;
          case 'status':
            logManager.writeLog('cli', 'info', 'User checked registration status', 'RegisterCommand');
            await handleCheckStatus();
            break;
          case 'exit':
            logManager.writeLog('cli', 'info', 'User cancelled registration operation', 'RegisterCommand');
            ui.info('操作已取消');
            break;
        }
      } else {
        ui.info('未找到注册信息，开始新的注册流程');
        await handleNewRegistration();
      }

    } catch (error: any) {
      if (error.name === 'ExitPromptError') {
        ui.info('操作已取消');
      } else {
        ui.error(`注册过程中发生错误: ${error.message}`);
      }
    }
  });

// 处理新注册
async function handleNewRegistration() {
  ui.showTitle('📝 新设备注册');

  ui.info('请输入网关注册信息：');

  const gatewayUrl = await input({
    message: '网关 URL:',
    validate: (value) => {
      if (!value) return '网关 URL 不能为空';
      try {
        new URL(value);
        return true;
      } catch {
        return '请输入有效的 URL 格式';
      }
    }
  });

  const nodeCode = await input({
    message: '节点代码:',
    validate: (value) => value ? true : '节点代码不能为空'
  });

  const gatewayApiKey = await input({
    message: '网关 API 密钥:',
    validate: (value) => value ? true : 'API 密钥不能为空'
  });

  const rewardAddress = await input({
    message: '奖励地址:',
    validate: (value) => value ? true : '奖励地址不能为空'
  });

  const apiBasePath = await input({
    message: 'API 服务器基础路径:',
    default: 'http://localhost:8716'
  });

  // 确认信息
  ui.showStatusBox('📋 注册信息确认', [
    { label: '网关 URL', value: gatewayUrl },
    { label: '节点代码', value: nodeCode },
    { label: '奖励地址', value: rewardAddress },
    { label: 'API 基础路径', value: apiBasePath }
  ]);

  const confirmed = await confirm({
    message: '确认注册信息是否正确？',
    default: true
  });

  if (!confirmed) {
    ui.info('注册已取消');
    return;
  }

  // 执行注册
  const success = await gatewayService.registerDevice({
    gatewayUrl,
    nodeCode,
    gatewayApiKey,
    rewardAddress,
    apiBasePath
  });

  if (success) {
    logManager.writeLog('cli', 'info', `Device registration successful for gateway: ${gatewayUrl}`, 'RegisterCommand');
    ui.success('🎉 设备注册成功！');
    ui.info('您现在可以使用以下命令：');
    ui.info('• sight-cli model - 管理模型');
    ui.info('• sight-cli status - 查看运行状态');
  } else {
    logManager.writeLog('cli', 'error', `Device registration failed for gateway: ${gatewayUrl}`, 'RegisterCommand');
    ui.error('注册失败，请检查输入信息并重试');
  }
}

// 处理重新注册
async function handleReRegister() {
  ui.showTitle('🔄 重新注册设备');

  const confirmed = await confirm({
    message: '确认使用保存的信息重新注册设备？',
    default: true
  });

  if (!confirmed) {
    ui.info('重新注册已取消');
    return;
  }

  const success = await gatewayService.reRegisterDevice();

  if (success) {
    ui.success('🎉 设备重新注册成功！');
  } else {
    ui.error('重新注册失败');
  }
}

// 处理清除注册
async function handleClearRegistration() {
  ui.showTitle('🗑️ 清除注册信息');

  ui.warning('此操作将清除所有保存的注册信息');

  const confirmed = await confirm({
    message: '确认清除注册信息？',
    default: false
  });

  if (!confirmed) {
    ui.info('清除操作已取消');
    return;
  }

  const success = await gatewayService.clearRegistration();

  if (success) {
    ui.success('注册信息已清除');
  } else {
    ui.error('清除注册信息失败');
  }
}

// 处理检查状态
async function handleCheckStatus() {
  ui.showTitle('📊 注册状态检查');

  ui.startSpinner('检查网关连接状态...');

  const status = await gatewayService.getGatewayStatus();

  if (status) {
    ui.stopSpinner(true, '状态获取成功');

    ui.showStatusBox('🔗 网关连接状态', [
      {
        label: '连接状态',
        value: status.connected ? '已连接' : '未连接',
        status: status.connected ? 'success' : 'error'
      },
      { label: '设备 ID', value: status.deviceId || '未知' },
      { label: '最后心跳', value: status.lastHeartbeat || '未知' },
      { label: '网关地址', value: status.gatewayAddress || '未知' }
    ]);
  } else {
    ui.stopSpinner(false, '无法获取网关状态');
  }
}
