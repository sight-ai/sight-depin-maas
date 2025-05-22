import { Command } from 'commander';
import { input, confirm, select, checkbox } from '@inquirer/prompts';
import { CliUI } from '../utils/cli-ui';
import { ModelService } from '../services/model.service';

const ui = new CliUI();
const modelService = new ModelService();

export const modelCommand = new Command('model')
  .alias('mod')
  .description('🤖 模型上报管理')
  .action(async () => {
    try {
      ui.showTitle('🤖 模型上报管理');

      // 检查 Ollama 服务
      if (!await modelService.checkOllamaService()) {
        return;
      }

      const action = await select({
        message: '选择操作：',
        choices: [
          { name: '📋 查看本地模型', value: 'list' },
          { name: '▶️ 启动模型（上报）', value: 'start' },
          { name: '⏹️ 查看运行中的模型', value: 'running' },
          { name: '⬇️ 拉取新模型', value: 'pull' },
          { name: '🗑️ 删除模型', value: 'delete' },
          { name: '📤 报告模型到网关', value: 'report' },
          { name: '🚪 返回', value: 'exit' }
        ]
      });

      switch (action) {
        case 'list':
          await handleListModels();
          break;
        case 'start':
          await handleStartModel();
          break;
        case 'running':
          await handleShowRunningModels();
          break;
        case 'pull':
          await handlePullModel();
          break;
        case 'delete':
          await handleDeleteModel();
          break;
        case 'report':
          await handleReportModels();
          break;
        case 'exit':
          ui.info('操作已取消');
          break;
      }

    } catch (error: any) {
      if (error.name === 'ExitPromptError') {
        ui.info('操作已取消');
      } else {
        ui.error(`模型管理过程中发生错误: ${error.message}`);
      }
    }
  });

// 查看本地模型
async function handleListModels() {
  ui.showTitle('📋 本地模型列表');
  
  const models = await modelService.getLocalModels();
  
  if (models.length === 0) {
    ui.warning('未找到本地模型');
    ui.info('您可以使用 "拉取新模型" 功能下载模型');
    return;
  }

  // 创建模型表格
  const headers = ['模型名称', '大小', '修改时间', '格式'];
  const rows = models.map(model => [
    model.name,
    model.size || '未知',
    modelService.formatTime(model.modified),
    model.details?.format || '未知'
  ]);

  console.log(ui.createTable(headers, rows));
  
  ui.info(`总共找到 ${models.length} 个模型`);
}

// 启动模型
async function handleStartModel() {
  ui.showTitle('▶️ 启动模型（上报）');
  
  const models = await modelService.getLocalModels();
  
  if (models.length === 0) {
    ui.warning('未找到本地模型');
    return;
  }

  const selectedModel = await select({
    message: '选择要启动的模型：',
    choices: models.map(model => ({
      name: `${model.name} (${model.size})`,
      value: model.name
    }))
  });

  const success = await modelService.startModel(selectedModel);
  
  if (success) {
    ui.success(`🎉 模型 ${selectedModel} 已成功启动！`);
    ui.info('模型现在可以接收任务了');
  } else {
    ui.error(`模型 ${selectedModel} 启动失败`);
  }
}

// 查看运行中的模型
async function handleShowRunningModels() {
  ui.showTitle('⏹️ 运行中的模型');
  
  const runningModels = await modelService.getRunningModels();
  
  if (runningModels.length === 0) {
    ui.warning('当前没有运行中的模型');
    ui.info('您可以使用 "启动模型" 功能启动模型');
    return;
  }

  ui.showStatusBox('🔄 运行状态', runningModels.map(model => ({
    label: model.name,
    value: `${model.status} ${model.memory_usage ? `(内存: ${model.memory_usage})` : ''}`,
    status: model.status === 'running' ? 'success' : 'warning'
  })));
}

// 拉取新模型
async function handlePullModel() {
  ui.showTitle('⬇️ 拉取新模型');
  
  ui.info('常用模型推荐：');
  ui.info('• llama2:7b - 轻量级通用模型');
  ui.info('• llama2:13b - 中等规模通用模型');
  ui.info('• codellama:7b - 代码生成模型');
  ui.info('• mistral:7b - 高效能模型');
  ui.info('• deepseek-coder:6.7b - 代码专用模型');

  const modelName = await input({
    message: '输入要拉取的模型名称:',
    validate: (value) => value ? true : '模型名称不能为空'
  });

  const confirmed = await confirm({
    message: `确认拉取模型 ${modelName}？`,
    default: true
  });

  if (!confirmed) {
    ui.info('拉取操作已取消');
    return;
  }

  const success = await modelService.pullModel(modelName);
  
  if (success) {
    ui.success(`🎉 模型 ${modelName} 拉取成功！`);
  } else {
    ui.error(`模型 ${modelName} 拉取失败`);
  }
}

// 删除模型
async function handleDeleteModel() {
  ui.showTitle('🗑️ 删除模型');
  
  const models = await modelService.getLocalModels();
  
  if (models.length === 0) {
    ui.warning('未找到本地模型');
    return;
  }

  const selectedModel = await select({
    message: '选择要删除的模型：',
    choices: models.map(model => ({
      name: `${model.name} (${model.size})`,
      value: model.name
    }))
  });

  ui.warning(`⚠️ 此操作将永久删除模型 ${selectedModel}`);
  
  const confirmed = await confirm({
    message: '确认删除？',
    default: false
  });

  if (!confirmed) {
    ui.info('删除操作已取消');
    return;
  }

  const success = await modelService.deleteModel(selectedModel);
  
  if (success) {
    ui.success(`模型 ${selectedModel} 已删除`);
  } else {
    ui.error(`模型 ${selectedModel} 删除失败`);
  }
}

// 报告模型到网关
async function handleReportModels() {
  ui.showTitle('📤 报告模型到网关');
  
  const models = await modelService.getLocalModels();
  
  if (models.length === 0) {
    ui.warning('未找到本地模型');
    return;
  }

  const reportAll = await confirm({
    message: '是否报告所有模型？',
    default: true
  });

  let selectedModels: string[] = [];

  if (!reportAll) {
    selectedModels = await checkbox({
      message: '选择要报告的模型：',
      choices: models.map(model => ({
        name: `${model.name} (${model.size})`,
        value: model.name
      }))
    });

    if (selectedModels.length === 0) {
      ui.info('未选择任何模型');
      return;
    }
  }

  const success = await modelService.reportModelsToGateway(reportAll ? undefined : selectedModels);
  
  if (success) {
    ui.success('🎉 模型报告成功！');
    if (reportAll) {
      ui.info(`已报告所有 ${models.length} 个模型到网关`);
    } else {
      ui.info(`已报告 ${selectedModels.length} 个选定模型到网关`);
    }
  } else {
    ui.error('模型报告失败');
  }
}
