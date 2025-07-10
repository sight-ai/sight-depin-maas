import React, { useState, useEffect } from 'react';
import {
  Brain,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

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
  const [reportingModel, setReportingModel] = useState<string | null>(null);
  const [currentFramework, setCurrentFramework] = useState<string>('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [buttonStates, setButtonStates] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

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

    // Set loading state for all models being reported
    const newStates: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
    modelNames.forEach(name => {
      newStates[name] = 'loading';
    });
    setButtonStates(prev => ({ ...prev, ...newStates }));

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

        // Set success state for successfully reported models
        const successStates: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
        data.reportedModels.forEach(name => {
          successStates[name] = 'success';
        });
        setButtonStates(prev => ({ ...prev, ...successStates }));

        // Reset to idle after 3 seconds
        setTimeout(() => {
          const resetStates: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
          data.reportedModels.forEach(name => {
            resetStates[name] = 'idle';
          });
          setButtonStates(prev => ({ ...prev, ...resetStates }));
        }, 3000);

        // Re-fetch model list to update status
        await fetchLocalModels();
      } else {
        console.error('Failed to report models:', data);

        // Set error state for failed models
        const errorStates: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
        modelNames.forEach(name => {
          errorStates[name] = 'error';
        });
        setButtonStates(prev => ({ ...prev, ...errorStates }));

        // Reset to idle after 4 seconds
        setTimeout(() => {
          const resetStates: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
          modelNames.forEach(name => {
            resetStates[name] = 'idle';
          });
          setButtonStates(prev => ({ ...prev, ...resetStates }));
        }, 4000);
      }
    } catch (error) {
      console.error('Error reporting models:', error);

      // Set error state for all models on network error
      const errorStates: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
      modelNames.forEach(name => {
        errorStates[name] = 'error';
      });
      setButtonStates(prev => ({ ...prev, ...errorStates }));

      // Reset to idle after 4 seconds
      setTimeout(() => {
        const resetStates: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
        modelNames.forEach(name => {
          resetStates[name] = 'idle';
        });
        setButtonStates(prev => ({ ...prev, ...resetStates }));
      }, 4000);
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

  const handleReportModel = async (modelName: string) => {
    setReportingModel(modelName);
    await reportModels([modelName]);
    setReportingModel(null);
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-black mb-2">Model Configuration</h1>
        <p className="text-gray-600">
          Current Framework: <span className="font-medium">{currentFramework || 'Unknown'}</span> •
          Total <span className="font-medium">{localModels.length}</span> models
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-black mb-4">Model Control Panel</h2>

        <div className="flex flex-wrap gap-3">
          {/* Refresh Models */}
          <button
            onClick={handleScanLocalModels}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="text-sm font-medium text-black">
              {isLoading ? 'Scanning...' : 'Refresh Model List'}
            </span>
          </button>

          {/* Report Selected */}
          {selectedModels.length > 0 && (
            <button
              onClick={handleReportSelectedModels}
              className={`flex items-center gap-2 px-4 py-2 bg-[#fff1b8] text-black rounded-lg transition-colors ${
                isReporting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isReporting}
            >
              {isReporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isReporting ? 'Reporting...' : `Report Selected (${selectedModels.length})`}
              </span>
            </button>
          )}

          {/* Report All */}
          <button
            onClick={handleReportAllModels}
            className={`flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ${
              localModels.length === 0 || isReporting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={localModels.length === 0 || isReporting}
          >
            {isReporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {isReporting ? 'Reporting...' : 'Batch Report All'}
            </span>
          </button>
        </div>
      </div>

      {/* Model List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-black mb-4">Local Models</h2>

        {localModels.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-600 text-lg mb-2">
              {isLoading ? 'Scanning for models...' : 'No models found'}
            </div>
            <div className="text-gray-500 text-sm">
              {isLoading ? 'Please wait while we scan your system' : 'Click "Refresh Model List" to scan your system'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {localModels.map((model, index) => (
              <div key={`${model.name}-${index}`} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.name)}
                      onChange={() => toggleModelSelection(model.name)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Brain className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-black text-sm">{model.name}</div>
                      {model.details && (
                        <div className="text-xs text-gray-600">
                          {model.details.family} • {formatFileSize(model.size)} • {model.details.parameter_size}
                          {model.details.quantization_level && ` • ${model.details.quantization_level}`}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Modified: {new Date(model.modified_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const buttonState = buttonStates[model.name] || 'idle';
                      const isCurrentlyReporting = reportingModel === model.name;

                      let buttonClass = 'flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
                      let buttonText = 'Report';
                      let icon = <Download className="h-3 w-3" />;

                      switch (buttonState) {
                        case 'loading':
                          buttonClass += ' bg-gray-100 text-gray-600 cursor-not-allowed';
                          buttonText = 'Reporting...';
                          icon = <Loader2 className="h-3 w-3 animate-spin" />;
                          break;
                        case 'success':
                          buttonClass += ' bg-green-100 text-green-700';
                          buttonText = 'Reported';
                          icon = <CheckCircle className="h-3 w-3" />;
                          break;
                        case 'error':
                          buttonClass += ' bg-red-100 text-red-700';
                          buttonText = 'Failed';
                          icon = <AlertCircle className="h-3 w-3" />;
                          break;
                        default:
                          buttonClass += ' bg-blue-600 text-white hover:bg-blue-700';
                          break;
                      }

                      return (
                        <button
                          className={buttonClass}
                          onClick={() => handleReportModel(model.name)}
                          disabled={isReporting || isCurrentlyReporting || buttonState === 'loading'}
                        >
                          {icon}
                          {buttonText}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
