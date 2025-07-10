/**
 * Settings页面组件 - 严格按照Figma设计实现
 *
 * 遵循SOLID原则：
 * - 单一职责原则：UI组件只负责展示，业务逻辑由Hook处理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：使用专门的Hook接口
 */

import React, { useState, useCallback } from 'react';
import { Download, AlertCircle, ChevronDown } from 'lucide-react';
import { useSettings, SETTINGS_CONSTANTS } from '../hooks/useSettings';
import { BackendStatus } from '../hooks/types';

interface SettingsProps {
  backendStatus: BackendStatus;
}

/**
 * General Settings组件 - 严格按照Figma设计实现
 */
const GeneralSettings: React.FC<{
  autoStartOnBoot: boolean;
  systemTray: boolean;
  silentMode: boolean;
  isLoading: boolean;
  onToggle: (setting: string, value: boolean) => Promise<void>;
}> = ({ autoStartOnBoot, systemTray, silentMode, isLoading, onToggle }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'stretch',
      gap: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '823px'
      }}>
        <h2 style={{
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '24px',
          lineHeight: '1.2em',
          letterSpacing: '-2%',
          color: '#000000'
        }}>
          General Settings
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'stretch',
        gap: '12px'
      }}>
        {/* Auto Start on Boot */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: '16px',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            width: '695px',
            height: '45px'
          }}>
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 400,
              fontSize: '18px',
              lineHeight: '1.33em',
              letterSpacing: '3.33%',
              color: '#1D1B20'
            }}>
              Auto Start on Boot
            </span>
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.6em',
              letterSpacing: '4%',
              color: '#878787'
            }}>
              Automatically start client when system boots
            </span>
          </div>

          {/* Switch */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'stretch',
              alignItems: 'stretch',
              padding: '2px 4px',
              width: '52px',
              height: '32px',
              backgroundColor: autoStartOnBoot ? '#6750A4' : '#E0E0E0',
              borderRadius: '100px',
              cursor: isLoading ? 'default' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onClick={() => !isLoading && onToggle('autoStartOnBoot', !autoStartOnBoot)}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '4px',
              position: 'relative',
              left: autoStartOnBoot ? '8px' : '-10px',
              transition: 'left 0.2s'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                padding: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '11px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  width: '2px',
                  height: '2px'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* System Tray */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: '16px',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            width: '695px',
            height: '45px'
          }}>
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 400,
              fontSize: '18px',
              lineHeight: '1.33em',
              letterSpacing: '3.33%',
              color: '#1D1B20'
            }}>
              System Tray
            </span>
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.6em',
              letterSpacing: '4%',
              color: '#878787'
            }}>
              Show in system tray when minimized
            </span>
          </div>

          {/* Switch */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'stretch',
              alignItems: 'stretch',
              padding: '2px 4px',
              width: '52px',
              height: '32px',
              backgroundColor: systemTray ? '#6750A4' : '#E0E0E0',
              borderRadius: '100px',
              cursor: isLoading ? 'default' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onClick={() => !isLoading && onToggle('systemTray', !systemTray)}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '4px',
              position: 'relative',
              left: systemTray ? '8px' : '-10px',
              transition: 'left 0.2s'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                padding: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '11px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  width: '2px',
                  height: '2px'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Silent Mode */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: '16px',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            width: '695px',
            height: '45px'
          }}>
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 400,
              fontSize: '18px',
              lineHeight: '1.33em',
              letterSpacing: '3.33%',
              color: '#1D1B20'
            }}>
              Silent Mode
            </span>
            <span style={{
              fontFamily: 'Roboto',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.6em',
              letterSpacing: '4%',
              color: '#878787'
            }}>
              Reduce notifications and prompts
            </span>
          </div>

          {/* Switch */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'stretch',
              alignItems: 'stretch',
              padding: '2px 4px',
              width: '52px',
              height: '32px',
              backgroundColor: silentMode ? '#6750A4' : '#E0E0E0',
              borderRadius: '100px',
              cursor: isLoading ? 'default' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onClick={() => !isLoading && onToggle('silentMode', !silentMode)}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '4px',
              position: 'relative',
              left: silentMode ? '8px' : '-10px',
              transition: 'left 0.2s'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                padding: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '11px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  width: '2px',
                  height: '2px'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Data & Privacy组件 - 严格按照Figma设计实现
 */
const DataPrivacySettings: React.FC<{
  dataDirectory: string;
  logLevel: string;
  isLoading: boolean;
  onLogLevelChange: (level: string) => Promise<void>;
}> = ({ dataDirectory, logLevel, isLoading, onLogLevelChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const logLevelOptions = [
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warning' },
    { value: 'error', label: 'Error' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'stretch',
      gap: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '823px'
      }}>
        <h2 style={{
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '24px',
          lineHeight: '1.2em',
          letterSpacing: '-2%',
          color: '#000000'
        }}>
          Data & Privacy
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'stretch',
        gap: '12px'
      }}>
        {/* Data Directory */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: '16px',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontWeight: 400,
            fontSize: '18px',
            lineHeight: '1.33em',
            letterSpacing: '3.33%',
            color: '#49454F'
          }}>
            Data Directory
          </span>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            backgroundColor: '#F9F9F9',
            borderRadius: '8px'
          }}>
            <span style={{
              fontFamily: 'Menlo',
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: '1.16em',
              color: '#000000'
            }}>
              {dataDirectory}
            </span>
          </div>
        </div>

        {/* Log Level */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: '16px',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <span style={{
            fontFamily: 'Roboto',
            fontWeight: 400,
            fontSize: '18px',
            lineHeight: '1.33em',
            letterSpacing: '3.33%',
            color: '#49454F'
          }}>
            Log Level
          </span>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                backgroundColor: '#F9F9F9',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '120px'
              }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: '15px',
                lineHeight: '1.16em',
                color: '#000000'
              }}>
                {logLevelOptions.find(opt => opt.value === logLevel)?.label || 'Info'}
              </span>
              <ChevronDown style={{
                width: '16px',
                height: '16px',
                color: '#1E1E1E',
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} />
            </div>

            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 10,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                minWidth: '120px'
              }}>
                {logLevelOptions.map((option) => (
                  <div
                    key={option.value}
                    style={{
                      padding: '10px',
                      cursor: 'pointer',
                      backgroundColor: logLevel === option.value ? '#F0F0F0' : 'transparent',
                      borderRadius: option === logLevelOptions[0] ? '8px 8px 0 0' :
                                   option === logLevelOptions[logLevelOptions.length - 1] ? '0 0 8px 8px' : '0'
                    }}
                    onClick={() => {
                      onLogLevelChange(option.value);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <span style={{
                      fontFamily: 'Inter',
                      fontWeight: 400,
                      fontSize: '15px',
                      lineHeight: '1.16em',
                      color: '#000000'
                    }}>
                      {option.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Advanced Settings组件 - 严格按照Figma设计实现
 */
const AdvancedSettings: React.FC<{
  onRestartService: () => Promise<void>;
  onResetAll: () => Promise<void>;
}> = ({ onRestartService, onResetAll }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'stretch',
      gap: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: '823px'
      }}>
        <h2 style={{
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '24px',
          lineHeight: '1.2em',
          letterSpacing: '-2%',
          color: '#000000'
        }}>
          Advanced Settings
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'stretch',
        gap: '12px'
      }}>
        {/* Restart Backend Service Button */}
        <button
          onClick={onRestartService}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#F8F5FF',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Download style={{
            width: '16px',
            height: '16px',
            color: '#6750A4',
            strokeWidth: 1.6
          }} />
          <span style={{
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '1em',
            color: '#6750A4'
          }}>
            Restart Backend Service
          </span>
        </button>

        {/* Reset All Button */}
        <button
          onClick={onResetAll}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
            gap: '8px',
            padding: '16px 12px',
            backgroundColor: '#FFF1F0',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <AlertCircle style={{
            width: '16px',
            height: '16px',
            color: '#CF1322',
            strokeWidth: 1.6
          }} />
          <span style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: '1em',
            color: '#CF1322'
          }}>
            Reset All (Dangerous)
          </span>
        </button>
      </div>
    </div>
  );
};

/**
 * 主Settings组件 - 严格按照Figma设计实现
 */
export const Settings: React.FC<SettingsProps> = ({ backendStatus }) => {
  // 使用专用Settings Hook获取数据 - 依赖倒置原则
  const {
    data,
    loading,
    updateDataPrivacySettings,
    restartBackendService,
    resetAllSettings,
    toggleSetting
  } = useSettings(backendStatus);

  // 成功消息状态
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 切换通用设置
  const handleToggleGeneralSetting = useCallback(async (setting: string, value: boolean) => {
    try {
      await toggleSetting('general', setting, value);
      setSuccessMessage('Settings updated successfully');
      setTimeout(() => setSuccessMessage(null), SETTINGS_CONSTANTS.SUCCESS_MESSAGE_DURATION);
    } catch (error) {
      console.error('Toggle general setting failed:', error);
      // 这里可以显示错误提示
    }
  }, [toggleSetting]);

  // 更改日志级别
  const handleLogLevelChange = useCallback(async (level: string) => {
    try {
      await updateDataPrivacySettings({ logLevel: level as any });
      setSuccessMessage('Log level updated successfully');
      setTimeout(() => setSuccessMessage(null), SETTINGS_CONSTANTS.SUCCESS_MESSAGE_DURATION);
    } catch (error) {
      console.error('Update log level failed:', error);
      // 这里可以显示错误提示
    }
  }, [updateDataPrivacySettings]);

  // 重启后端服务
  const handleRestartService = useCallback(async () => {
    try {
      await restartBackendService();
      setSuccessMessage('Backend service restarted successfully');
      setTimeout(() => setSuccessMessage(null), SETTINGS_CONSTANTS.SUCCESS_MESSAGE_DURATION);
    } catch (error) {
      console.error('Restart service failed:', error);
      // 这里可以显示错误提示
    }
  }, [restartBackendService]);

  // 重置所有设置
  const handleResetAll = useCallback(async () => {
    try {
      await resetAllSettings();
      setSuccessMessage('All settings reset successfully');
      setTimeout(() => setSuccessMessage(null), SETTINGS_CONSTANTS.SUCCESS_MESSAGE_DURATION);
    } catch (error) {
      console.error('Reset all settings failed:', error);
      // 这里可以显示错误提示
    }
  }, [resetAllSettings]);

  // 错误状态处理
  if (loading.error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Failed to load settings data</h3>
            <p className="text-sm text-red-600 mt-1">{loading.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-lg relative m-3"
      style={{
        width: '1225px',
        height: '1050px',
        borderRadius: '16px',
        padding: '27px 26px',
        boxShadow: '0px 0px 42.4px 7px rgba(237, 237, 237, 1)'
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '48px',
        // width: '1010px',
        padding:'50px'
        
        // position: 'relative',
        // left: '113px',
        // top: '70px'
      }}>
        {/* General Settings */}
        <GeneralSettings
          autoStartOnBoot={data?.generalSettings.autoStartOnBoot || true}
          systemTray={data?.generalSettings.systemTray || true}
          silentMode={data?.generalSettings.silentMode || true}
          isLoading={loading.isLoading}
          onToggle={handleToggleGeneralSetting}
        />

        {/* Data & Privacy */}
        <DataPrivacySettings
          dataDirectory={data?.dataPrivacySettings.dataDirectory || '/ip4/0.0.0.0/tcp/4001'}
          logLevel={data?.dataPrivacySettings.logLevel || 'info'}
          isLoading={loading.isLoading}
          onLogLevelChange={handleLogLevelChange}
        />

        {/* Advanced Settings */}
        <AdvancedSettings
          onRestartService={handleRestartService}
          onResetAll={handleResetAll}
        />
      </div>

      {/* 成功消息提示 */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          backgroundColor: '#10B981',
          color: '#FFFFFF',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          {successMessage}
        </div>
      )}
    </div>
  );
};