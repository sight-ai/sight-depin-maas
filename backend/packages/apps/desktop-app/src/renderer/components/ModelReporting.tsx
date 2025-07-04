import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import {
  Brain,
  Play,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  StopCircle,
  Plus,
  RefreshCw,
  FileText,
  Cpu,
  HardDrive,
  Loader2
} from 'lucide-react';

interface ModelReport {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  modelType: string;
  size: string;
  accuracy?: number;
}

interface LocalModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface ModelListResponse {
  success: boolean;
  framework: string;
  models: LocalModel[];
  total: number;
}

interface ModelReportResponse {
  success: boolean;
  message: string;
  reportedModels: string[];
}

export const ModelReporting: React.FC = () => {
  const [reports] = useState<ModelReport[]>([
    {
      id: '1',
      name: 'GPT-4 Fine-tuning',
      status: 'running',
      progress: 65,
      startTime: '2024-01-15 10:30:00',
      modelType: 'Language Model',
      size: '7.2 GB',
      accuracy: 92.5
    },
    {
      id: '2',
      name: 'Image Classification Model',
      status: 'completed',
      progress: 100,
      startTime: '2024-01-14 14:20:00',
      endTime: '2024-01-14 18:45:00',
      modelType: 'Computer Vision',
      size: '1.8 GB',
      accuracy: 96.8
    },
    {
      id: '3',
      name: 'Speech Recognition Training',
      status: 'failed',
      progress: 23,
      startTime: '2024-01-13 09:15:00',
      endTime: '2024-01-13 11:30:00',
      modelType: 'Audio Processing',
      size: '3.4 GB'
    },
  ]);

  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [currentFramework, setCurrentFramework] = useState<string>('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // 获取本地模型列表
  const fetchLocalModels = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8716/api/v1/models/list');
      const data: ModelListResponse = await response.json();

      if (data.success) {
        setLocalModels(data.models);
        setCurrentFramework(data.framework);
      } else {
        console.error('Failed to fetch models:', data);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 上报模型到网关
  const reportModels = async (modelNames: string[]) => {
    if (modelNames.length === 0) return;

    setIsReporting(true);
    try {
      const response = await fetch('http://localhost:8716/api/v1/models/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ models: modelNames }),
      });

      const data: ModelReportResponse = await response.json();

      if (data.success) {
        console.log('Models reported successfully:', data.reportedModels);
        // 重新获取模型列表以更新状态
        await fetchLocalModels();
      } else {
        console.error('Failed to report models:', data);
      }
    } catch (error) {
      console.error('Error reporting models:', error);
    } finally {
      setIsReporting(false);
    }
  };

  // 组件挂载时获取模型列表
  useEffect(() => {
    fetchLocalModels();
  }, []);

  const getStatusIcon = (status: ModelReport['status']) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <StopCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: ModelReport['status']) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: ModelReport['status']) => {
    switch (status) {
      case 'running':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleScanLocalModels = () => {
    fetchLocalModels();
  };

  const handleReportModel = (modelName: string) => {
    reportModels([modelName]);
  };

  const handleReportAllModels = () => {
    const modelNames = localModels.map(model => model.name);
    reportModels(modelNames);
  };

  const handleReportSelectedModels = () => {
    reportModels(selectedModels);
    setSelectedModels([]);
  };

  const toggleModelSelection = (modelName: string) => {
    setSelectedModels(prev =>
      prev.includes(modelName)
        ? prev.filter(name => name !== modelName)
        : [...prev, modelName]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 min-h-0">
      {/* 本地模型管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            本地模型管理
          </CardTitle>
          <CardDescription>
            当前框架: {currentFramework || '未知'} • 共 {localModels.length} 个模型
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleScanLocalModels}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isLoading ? '扫描中...' : '刷新模型列表'}
            </Button>
            <Button
              onClick={handleReportAllModels}
              variant="outline"
              className="flex items-center gap-2"
              disabled={localModels.length === 0 || isReporting}
            >
              {isReporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isReporting ? '上报中...' : '批量上报'}
            </Button>
            {selectedModels.length > 0 && (
              <Button
                onClick={handleReportSelectedModels}
                variant="default"
                className="flex items-center gap-2"
                disabled={isReporting}
              >
                <Download className="h-4 w-4" />
                上报选中 ({selectedModels.length})
              </Button>
            )}
          </div>

          {localModels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isLoading ? '正在加载模型列表...' : '未找到本地模型，请点击刷新按钮扫描'}
            </div>
          ) : (
            <div className="space-y-3">
              {localModels.map((model, index) => (
                <div key={`${model.name}-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.name)}
                      onChange={() => toggleModelSelection(model.name)}
                      className="rounded"
                    />
                    <Brain className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {model.details.family} • {formatFileSize(model.size)} • {model.details.parameter_size}
                        {model.details.quantization_level && ` • ${model.details.quantization_level}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        修改时间: {new Date(model.modified_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReportModel(model.name)}
                      disabled={isReporting}
                    >
                      {isReporting ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3 mr-1" />
                      )}
                      上报
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 模型训练任务 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            模型训练任务
          </CardTitle>
          <CardDescription>查看和管理模型训练进度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新建训练任务
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              导出报告
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              刷新状态
            </Button>
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(report.status)}
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(report.status)}`}>
                      {getStatusText(report.status)}
                    </span>
                  </div>
                  <CardDescription>
                    {report.modelType} • {report.size}
                    {report.accuracy && ` • 准确率: ${report.accuracy}%`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>训练进度</span>
                      <span>{report.progress}%</span>
                    </div>
                    <Progress value={report.progress} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">开始时间:</span>
                      <div className="font-medium">{report.startTime}</div>
                    </div>
                    {report.endTime && (
                      <div>
                        <span className="text-muted-foreground">结束时间:</span>
                        <div className="font-medium">{report.endTime}</div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      查看详情
                    </Button>
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      下载日志
                    </Button>
                    {report.status === 'running' && (
                      <Button size="sm" variant="destructive" className="flex items-center gap-1">
                        <StopCircle className="h-3 w-3" />
                        停止任务
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
