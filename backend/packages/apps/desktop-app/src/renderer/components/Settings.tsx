import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import {
  Settings as SettingsIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SettingsProps {}

export const Settings: React.FC<SettingsProps> = () => {
  const [autoStart, setAutoStart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    setMessage(null);

    try {
      // Set auto-start via IPC
      const result = await window.electronAPI?.setAutoStart(checked);

      if (result?.success) {
        setAutoStart(checked);
        setMessage({
          type: 'success',
          text: `Auto-start ${checked ? 'enabled' : 'disabled'} successfully`
        });
      } else {
        setMessage({
          type: 'error',
          text: result?.error || 'Failed to update auto-start setting'
        });
      }
    } catch (error) {
      console.error('Error setting auto-start:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update auto-start setting'
      });
    } finally {
      setIsLoading(false);

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
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

          {/* Status Message */}
          {message && (
            <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>




    </div>
  );
};
