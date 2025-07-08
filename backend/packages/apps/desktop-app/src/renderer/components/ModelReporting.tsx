import React, { useState, useEffect } from 'react';
import {
  Brain,
  Download,
  RefreshCw,
  HardDrive,
  Loader2
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
    <div className="space-y-6 min-h-0">
      {/* Local Model Management */}
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-cyan-400 font-mono flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            LOCAL MODEL MANAGEMENT
          </h3>
        </div>
        <div className="text-sm text-muted-foreground mb-6 font-mono">
          Current Framework: <span className="text-cyan-400">{currentFramework || 'Unknown'}</span> • Total <span className="text-cyan-400">{localModels.length}</span> models
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Primary Action - Most prominent when models are selected */}
            {selectedModels.length > 0 && (
              <button
                onClick={handleReportSelectedModels}
                className={`cyber-button variant-success flex items-center gap-2 order-1 ${isReporting ? 'loading' : ''}`}
                disabled={isReporting}
                title={isReporting ? 'Reporting selected models...' : `Report ${selectedModels.length} selected models`}
              >
                {isReporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isReporting ? 'REPORTING...' : `REPORT SELECTED (${selectedModels.length})`}
              </button>
            )}

            {/* Secondary Actions */}
            <button
              onClick={handleScanLocalModels}
              className={`cyber-button variant-secondary flex items-center gap-2 order-3 ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
              title={isLoading ? 'Scanning for local models...' : 'Refresh the local model list'}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isLoading ? 'SCANNING...' : 'REFRESH MODEL LIST'}
            </button>

            {/* Warning Action - Batch operations need caution */}
            <button
              onClick={handleReportAllModels}
              className={`cyber-button variant-warning flex items-center gap-2 order-2 ${isReporting ? 'loading' : ''}`}
              disabled={localModels.length === 0 || isReporting}
              title={isReporting ? 'Reporting all models...' : localModels.length === 0 ? 'No models available to report' : `Report all ${localModels.length} models`}
            >
              {isReporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isReporting ? 'REPORTING...' : 'BATCH REPORT'}
            </button>
          </div>

          {localModels.length === 0 ? (
            <div className="text-center py-8 text-cyan-300/70 font-mono">
              {isLoading ? 'LOADING MODEL LIST...' : 'NO LOCAL MODELS FOUND, PLEASE CLICK REFRESH BUTTON TO SCAN'}
            </div>
          ) : (
            <div className="space-y-3">
              {localModels.map((model, index) => (
                <div key={`${model.name}-${index}`} className="flex items-center justify-between p-4 bg-black/20 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.name)}
                      onChange={() => toggleModelSelection(model.name)}
                      className="w-4 h-4 text-cyan-400 bg-transparent border-cyan-500/50 rounded focus:ring-cyan-400 focus:ring-2"
                    />
                    <Brain className="h-8 w-8 text-cyan-400" />
                    <div>
                      <div className="font-medium text-white font-mono">{model.name}</div>
                      {
                        model.details &&
                         <div className="text-sm text-cyan-300/70 font-mono">
                        {model.details.family} • {formatFileSize(model.size)} • {model.details.parameter_size}
                        {model.details.quantization_level && ` • ${model.details.quantization_level}`}
                      </div>
                      }
                      <div className="text-xs text-cyan-300/50 font-mono">
                        Modified: {new Date(model.modified_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const buttonState = buttonStates[model.name] || 'idle';
                      const isCurrentlyReporting = reportingModel === model.name;

                      let buttonClass = 'cyber-button text-xs px-5 py-1 text-white';
                      let buttonText = 'REPORT';
                      let buttonTitle = `Report ${model.name} to gateway`;

                      switch (buttonState) {
                        case 'loading':
                          buttonClass += ' loading';
                          buttonText = 'REPORTING...';
                          buttonTitle = `Reporting ${model.name}...`;
                          break;
                        case 'success':
                          buttonClass += ' success';
                          buttonText = 'REPORTED';
                          buttonTitle = `${model.name} reported successfully`;
                          break;
                        case 'error':
                          buttonClass += ' error';
                          buttonText = 'FAILED';
                          buttonTitle = `Failed to report ${model.name}`;
                          break;
                        default:
                          // idle state - use default values
                          break;
                      }

                      return (
                        <button
                          className={buttonClass}
                          onClick={() => handleReportModel(model.name)}
                          disabled={isReporting || isCurrentlyReporting || buttonState === 'loading'}
                          title={buttonTitle}
                        >
                          {buttonText}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
