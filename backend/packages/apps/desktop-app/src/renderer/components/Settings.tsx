import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import {
  Settings as SettingsIcon,
  Power,
  Bell,
  Monitor,
  Server,
  FileText,
  Download,
  RotateCcw,
  Save,
  RefreshCw
} from 'lucide-react';

interface SettingsProps {
  onRestartBackend: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onRestartBackend }) => {
  const [settings, setSettings] = useState({
    autoStart: true,
    minimizeToTray: false,
    enableNotifications: true,
    logLevel: 'info',
    backendPort: 8716,
    maxLogFiles: 10,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    // 这里实现保存设置的逻辑
    console.log('Saving settings:', settings);
  };

  const handleResetSettings = () => {
    setSettings({
      autoStart: true,
      minimizeToTray: false,
      enableNotifications: true,
      logLevel: 'info',
      backendPort: 8716,
      maxLogFiles: 10,
    });
  };

  return (
    <div className="space-y-6 min-h-0">
      {/* 应用程序设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            应用程序设置
          </CardTitle>
          <CardDescription>配置应用程序的基本行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">开机自动启动</div>
              <div className="text-sm text-muted-foreground">
                系统启动时自动启动 SightAI Desktop
              </div>
            </div>
            <Switch
              checked={settings.autoStart}
              onCheckedChange={(checked) => handleSettingChange('autoStart', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">最小化到系统托盘</div>
              <div className="text-sm text-muted-foreground">
                关闭窗口时最小化到系统托盘而不是退出应用
              </div>
            </div>
            <Switch
              checked={settings.minimizeToTray}
              onCheckedChange={(checked) => handleSettingChange('minimizeToTray', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">启用通知</div>
              <div className="text-sm text-muted-foreground">
                显示系统通知和任务完成提醒
              </div>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => handleSettingChange('enableNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 后端服务设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            后端服务设置
          </CardTitle>
          <CardDescription>配置后端服务参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="backend-port" className="text-sm font-medium">
                服务端口
              </label>
              <input
                id="backend-port"
                type="number"
                value={settings.backendPort}
                onChange={(e) => handleSettingChange('backendPort', parseInt(e.target.value))}
                min="1024"
                max="65535"
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              />
              <p className="text-xs text-muted-foreground">
                后端服务监听的端口号 (需要重启服务生效)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="log-level" className="text-sm font-medium">
                日志级别
              </label>
              <select
                id="log-level"
                value={settings.logLevel}
                onChange={(e) => handleSettingChange('logLevel', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="debug">调试 (Debug)</option>
                <option value="info">信息 (Info)</option>
                <option value="warn">警告 (Warn)</option>
                <option value="error">错误 (Error)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                设置日志记录的详细程度
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="max-log-files" className="text-sm font-medium">
              最大日志文件数
            </label>
            <input
              id="max-log-files"
              type="number"
              value={settings.maxLogFiles}
              onChange={(e) => handleSettingChange('maxLogFiles', parseInt(e.target.value))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-input rounded-md text-sm max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              保留的历史日志文件数量
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 系统操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            系统操作
          </CardTitle>
          <CardDescription>系统管理和维护操作</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Button
                onClick={onRestartBackend}
                className="w-full flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                重启后端服务
              </Button>
              <p className="text-xs text-muted-foreground">
                重新启动后端服务以应用新的配置
              </p>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                检查更新
              </Button>
              <p className="text-xs text-muted-foreground">
                检查并下载应用程序更新
              </p>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Download className="h-4 w-4" />
                导出配置
              </Button>
              <p className="text-xs text-muted-foreground">
                导出当前配置到文件
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 设置操作 */}
      <Card>
        <CardHeader>
          <CardTitle>保存设置</CardTitle>
          <CardDescription>保存或重置当前配置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={handleSaveSettings} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              保存设置
            </Button>
            <Button onClick={handleResetSettings} variant="outline" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              重置为默认值
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
