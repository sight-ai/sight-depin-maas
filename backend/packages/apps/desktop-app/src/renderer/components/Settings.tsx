import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import {
  Settings as SettingsIcon
} from 'lucide-react';

interface SettingsProps {}

export const Settings: React.FC<SettingsProps> = () => {
  const [autoStart, setAutoStart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get current auto-start status
  useEffect(() => {
    const fetchAutoStartStatus = async () => {
      try {
        // Get auto-start status via IPC
        const status = await window.electronAPI?.getAutoStart();
        setAutoStart(status || false);
      } catch (error) {
        console.error('Error fetching auto-start status:', error);
      }
    };

    fetchAutoStartStatus();
  }, []);

  const handleAutoStartChange = async (checked: boolean) => {
    setIsLoading(true);
    try {
      // Set auto-start via IPC
      await window.electronAPI?.setAutoStart(checked);
      setAutoStart(checked);
    } catch (error) {
      console.error('Error setting auto-start:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 min-h-0">
      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Application Settings
          </CardTitle>
          <CardDescription>Configure basic application behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Auto Start</div>
              <div className="text-sm text-muted-foreground">
                Automatically start SightAI Desktop when system boots
              </div>
            </div>
            <Switch
              checked={autoStart}
              onCheckedChange={handleAutoStartChange}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>




    </div>
  );
};
