import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Brain,
  Download,
  RefreshCw,
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
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [currentFramework, setCurrentFramework] = useState<string>('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Get local model list
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

  // Report models to gateway
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
        // Re-fetch model list to update status
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

  // Get model list when component mounts
  useEffect(() => {
    fetchLocalModels();
  }, []);

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
      {/* Local Model Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Local Model Management
          </CardTitle>
          <CardDescription>
            Current Framework: {currentFramework || 'Unknown'} • Total {localModels.length} models
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
              {isLoading ? 'Scanning...' : 'Refresh Model List'}
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
              {isReporting ? 'Reporting...' : 'Batch Report'}
            </Button>
            {selectedModels.length > 0 && (
              <Button
                onClick={handleReportSelectedModels}
                variant="default"
                className="flex items-center gap-2"
                disabled={isReporting}
              >
                <Download className="h-4 w-4" />
                Report Selected ({selectedModels.length})
              </Button>
            )}
          </div>

          {localModels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isLoading ? 'Loading model list...' : 'No local models found, please click refresh button to scan'}
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
                      {
                        model.details &&
                         <div className="text-sm text-muted-foreground">
                        {model.details.family} • {formatFileSize(model.size)} • {model.details.parameter_size}
                        {model.details.quantization_level && ` • ${model.details.quantization_level}`}
                      </div>
                      }
                      <div className="text-xs text-muted-foreground">
                        Modified: {new Date(model.modified_at).toLocaleString()}
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
                      Report
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
