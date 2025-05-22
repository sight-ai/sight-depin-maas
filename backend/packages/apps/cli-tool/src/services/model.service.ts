import fetch from 'node-fetch';
import { CliUI } from '../utils/cli-ui';

export interface ModelInfo {
  name: string;
  size: string;
  modified: string;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ModelStatus {
  name: string;
  status: 'running' | 'stopped' | 'loading' | 'error';
  memory_usage?: string;
  last_used?: string;
}

export class ModelService {
  private ui = new CliUI();
  private backendUrl = 'http://localhost:8716';
  private ollamaUrl = 'http://localhost:11434';

  // 检查 Ollama 服务状态
  async checkOllamaService(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/version`, {
        timeout: 3000
      });

      if (response.ok) {
        this.ui.success('Ollama 服务正在运行');
        return true;
      }
    } catch (error) {
      // Ollama 服务未运行
    }

    this.ui.error('Ollama 服务未运行');
    this.ui.info('请确保 Ollama 已安装并正在运行：');
    this.ui.info('1. 安装 Ollama: https://ollama.ai/download');
    this.ui.info('2. 启动 Ollama 服务');
    this.ui.info('3. 确保端口 11434 可访问');
    
    return false;
  }

  // 获取本地模型列表
  async getLocalModels(): Promise<ModelInfo[]> {
    try {
      this.ui.startSpinner('获取本地模型列表...');
      
      const response = await fetch(`${this.backendUrl}/api/v1/models/list`);
      
      if (response.ok) {
        const data = await response.json();
        this.ui.stopSpinner(true, `找到 ${data.models.length} 个模型`);
        return data.models || [];
      } else {
        this.ui.stopSpinner(false, '获取模型列表失败');
        return [];
      }
    } catch (error: any) {
      this.ui.stopSpinner(false, `获取模型列表失败: ${error.message}`);
      return [];
    }
  }

  // 拉取模型
  async pullModel(modelName: string): Promise<boolean> {
    try {
      this.ui.startSpinner(`正在拉取模型: ${modelName}...`);
      
      const response = await fetch(`${this.ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (response.ok) {
        this.ui.stopSpinner(true, `模型 ${modelName} 拉取成功`);
        return true;
      } else {
        this.ui.stopSpinner(false, `模型 ${modelName} 拉取失败`);
        return false;
      }
    } catch (error: any) {
      this.ui.stopSpinner(false, `拉取模型失败: ${error.message}`);
      return false;
    }
  }

  // 删除模型
  async deleteModel(modelName: string): Promise<boolean> {
    try {
      this.ui.startSpinner(`正在删除模型: ${modelName}...`);
      
      const response = await fetch(`${this.ollamaUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (response.ok) {
        this.ui.stopSpinner(true, `模型 ${modelName} 删除成功`);
        return true;
      } else {
        this.ui.stopSpinner(false, `模型 ${modelName} 删除失败`);
        return false;
      }
    } catch (error: any) {
      this.ui.stopSpinner(false, `删除模型失败: ${error.message}`);
      return false;
    }
  }

  // 启动模型（加载到内存）
  async startModel(modelName: string): Promise<boolean> {
    try {
      this.ui.startSpinner(`正在启动模型: ${modelName}...`);
      
      // 通过发送一个简单的请求来加载模型
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: 'Hello',
          stream: false,
          options: {
            num_predict: 1
          }
        }),
      });

      if (response.ok) {
        this.ui.stopSpinner(true, `模型 ${modelName} 启动成功`);
        return true;
      } else {
        this.ui.stopSpinner(false, `模型 ${modelName} 启动失败`);
        return false;
      }
    } catch (error: any) {
      this.ui.stopSpinner(false, `启动模型失败: ${error.message}`);
      return false;
    }
  }

  // 获取运行中的模型
  async getRunningModels(): Promise<ModelStatus[]> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/ps`);
      
      if (response.ok) {
        const data = await response.json();
        return data.models || [];
      } else {
        return [];
      }
    } catch (error: any) {
      this.ui.error(`获取运行模型失败: ${error.message}`);
      return [];
    }
  }

  // 报告模型到网关
  async reportModelsToGateway(selectedModels?: string[]): Promise<boolean> {
    try {
      this.ui.startSpinner('正在报告模型到网关...');
      
      const response = await fetch(`${this.backendUrl}/api/v1/models/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          models: selectedModels || [],
          reportAll: !selectedModels
        }),
      });

      if (response.ok) {
        this.ui.stopSpinner(true, '模型报告成功');
        return true;
      } else {
        this.ui.stopSpinner(false, '模型报告失败');
        return false;
      }
    } catch (error: any) {
      this.ui.stopSpinner(false, `报告模型失败: ${error.message}`);
      return false;
    }
  }

  // 格式化模型大小
  formatModelSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // 格式化时间
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小时前`;
    if (minutes > 0) return `${minutes} 分钟前`;
    return '刚刚';
  }
}
