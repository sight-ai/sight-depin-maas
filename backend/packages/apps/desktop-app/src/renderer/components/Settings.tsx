/**
 * Settings 页面组件
 * 
 * 根据 Figma 设计实现的设置页面
 * 包含通用设置、数据隐私和高级设置功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Download, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';

interface GeneralSettings {
  autoStartOnBoot: boolean;
  systemTray: boolean;
  silentMode: boolean;
}

interface DataPrivacySettings {
  dataDirectory: string;
  logLevel: 'Debug' | 'Info' | 'Warning' | 'Error';
}

interface SettingsProps {
  backendStatus?: {
    isRunning: boolean;
    port: number;
  };
}

export const Settings: React.FC<SettingsProps> = ({ backendStatus }) => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    autoStartOnBoot: true,
    systemTray: true,
    silentMode: true
  });

  const [dataPrivacySettings, setDataPrivacySettings] = useState<DataPrivacySettings>({
    dataDirectory: '/ip4/0.0.0.0/tcp/4001',
    logLevel: 'Info'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取设置
  const fetchSettings = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    setError(null);
    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/settings`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGeneralSettings(result.data.general);
          setDataPrivacySettings(result.data.dataPrivacy);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setError('Failed to load settings. Please check your connection.');
    }
  }, [backendStatus]);

  // 更新通用设置
  const updateGeneralSetting = useCallback(async (key: keyof GeneralSettings, value: boolean) => {
    if (!backendStatus?.isRunning) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/settings/general`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGeneralSettings(prev => ({
            ...prev,
            [key]: value
          }));
        } else {
          throw new Error(result.error || 'Failed to update setting');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update general setting:', error);
      setError('Failed to update setting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus]);

  // 更新日志级别
  const updateLogLevel = useCallback(async (logLevel: DataPrivacySettings['logLevel']) => {
    if (!backendStatus?.isRunning) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/settings/data-privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logLevel })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDataPrivacySettings(prev => ({
            ...prev,
            logLevel
          }));
        } else {
          throw new Error(result.error || 'Failed to update log level');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update log level:', error);
      setError('Failed to update log level. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus]);

  // 重启后端服务
  const restartBackendService = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/settings/restart-backend`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Backend service restarted successfully');
        } else {
          throw new Error(result.error || 'Failed to restart backend service');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to restart backend service:', error);
      setError('Failed to restart backend service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus]);

  // 重置所有设置
  const resetAllSettings = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    const confirmed = window.confirm('Are you sure you want to reset all settings? This action cannot be undone.');
    if (!confirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:${backendStatus.port}/api/v1/settings/reset`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 重新获取默认设置
          fetchSettings();
          console.log('All settings reset successfully');
        } else {
          throw new Error(result.error || 'Failed to reset settings');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      setError('Failed to reset settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [backendStatus, fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <div className="min-h-screen bg-white">
        <Card className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* General Settings Section */}
        <div className="space-y-6">
          <h1 className="text-2xl font-medium text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '24px', lineHeight: '1.2em', letterSpacing: '-2%' }}>
            General Settings
          </h1>
          
          <div className="space-y-3">
            {/* Auto Start on Boot */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded-xl min-h-[45px] gap-4">
              <div className="flex-1 space-y-1">
                <div className="text-lg text-[#1D1B20]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                  Auto Start on Boot
                </div>
                <div className="text-sm text-[#878787]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.6em', letterSpacing: '4%' }}>
                  Automatically start client when system boots
                </div>
              </div>
              <Switch
                checked={generalSettings.autoStartOnBoot}
                onCheckedChange={(checked) => updateGeneralSetting('autoStartOnBoot', checked)}
                disabled={isLoading}
                className="data-[state=checked]:bg-[#6750A4] data-[state=unchecked]:bg-gray-200 w-[52px] h-[32px]"
              />
            </div>

            {/* System Tray */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded-xl min-h-[45px] gap-4">
              <div className="flex-1 space-y-1">
                <div className="text-lg text-[#1D1B20]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                  System Tray
                </div>
                <div className="text-sm text-[#878787]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.6em', letterSpacing: '4%' }}>
                  Show in system tray when minimized
                </div>
              </div>
              <Switch
                checked={generalSettings.systemTray}
                onCheckedChange={(checked) => updateGeneralSetting('systemTray', checked)}
                disabled={isLoading}
                className="data-[state=checked]:bg-[#6750A4] data-[state=unchecked]:bg-gray-200 w-[52px] h-[32px]"
              />
            </div>

            {/* Silent Mode */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded-xl min-h-[45px] gap-4">
              <div className="flex-1 space-y-1">
                <div className="text-lg text-[#1D1B20]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                  Silent Mode
                </div>
                <div className="text-sm text-[#878787]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '15px', lineHeight: '1.6em', letterSpacing: '4%' }}>
                  Reduce notifications and prompts
                </div>
              </div>
              <Switch
                checked={generalSettings.silentMode}
                onCheckedChange={(checked) => updateGeneralSetting('silentMode', checked)}
                disabled={isLoading}
                className="data-[state=checked]:bg-[#6750A4] data-[state=unchecked]:bg-gray-200 w-[52px] h-[32px]"
              />
            </div>
          </div>
        </div>

        {/* Data & Privacy Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '24px', lineHeight: '1.2em', letterSpacing: '-2%' }}>
            Data & Privacy
          </h2>

          <div className="space-y-3">
            {/* Data Directory */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded-xl gap-4">
              <div className="text-lg text-[#49454F] flex-shrink-0" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                Data Directory
              </div>
              <div className="flex-1 max-w-xs bg-[#F9F9F9] rounded-lg px-2.5 py-2.5">
                <div className="text-sm text-black" style={{ fontFamily: 'Menlo, monospace', fontWeight: 400, fontSize: '15px', lineHeight: '1.16em' }}>
                  {dataPrivacySettings.dataDirectory}
                </div>
              </div>
            </div>

            {/* Log Level */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded-xl gap-4">
              <div className="text-lg text-[#49454F] flex-shrink-0" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, fontSize: '18px', lineHeight: '1.33em', letterSpacing: '3.33%' }}>
                Log Level
              </div>
              <div className="flex-1 max-w-xs">
                <Select value={dataPrivacySettings.logLevel} onValueChange={updateLogLevel}>
                  <SelectTrigger className="bg-white border-[#D9D9D9] rounded-lg px-4 py-3 h-auto">
                    <SelectValue style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '16px', lineHeight: '1em', color: '#1E1E1E' }} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Debug">Debug</SelectItem>
                    <SelectItem value="Info">Info</SelectItem>
                    <SelectItem value="Warning">Warning</SelectItem>
                    <SelectItem value="Error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings Section */}
        <div className="space-y-3">
          <h2 className="text-2xl font-medium text-black" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '24px', lineHeight: '1.2em', letterSpacing: '-2%' }}>
            Advanced Settings
          </h2>

          <div className="space-y-3">
            {/* Restart Backend Service */}
            <Button
              onClick={restartBackendService}
              disabled={isLoading}
              className="w-full bg-[#F0F0F0] hover:bg-gray-200 text-black px-3 py-3 rounded-lg flex items-center justify-center gap-2"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '16px', lineHeight: '1em' }}
            >
              <Download size={16} className="text-black" />
              Restart Backend Service
            </Button>

            {/* Reset All */}
            <Button
              onClick={resetAllSettings}
              disabled={isLoading}
              className="w-full bg-[#FCF2F2] hover:bg-red-100 text-[#AA2E26] px-3 py-3 rounded-lg flex items-center justify-center gap-2"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '16px', lineHeight: '1em' }}
            >
              <AlertCircle size={16} className="text-[#AA2E26]" />
              Reset All
            </Button>
          </div>
        </div>
      </div>
      </Card>
    </div>
  );
};
