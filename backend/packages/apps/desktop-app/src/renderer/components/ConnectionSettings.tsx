import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Server,
  CheckCircle,
  AlertCircle,
  Loader2,
  User
} from 'lucide-react';

interface RegistrationStatus {
  status: 'registered' | 'unregistered' | 'pending';
  deviceId: string;
  deviceName: string;
  message: string;
}

interface DeviceConfig {
  deviceId: string;
  deviceName: string;
  gatewayAddress: string;
  rewardAddress: string;
  code: string;
}

export const ConnectionSettings: React.FC = () => {
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
    status: 'unregistered',
    deviceId: '',
    deviceName: '',
    message: ''
  });

  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
  const [gatewayAddress, setGatewayAddress] = useState('https://sightai.io/api/model');
  const [rewardAddress, setRewardAddress] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load device config from file
  const loadDeviceConfig = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.readDeviceConfig();
        if (result.success && result.data) {
          setDeviceConfig(result.data);
          setGatewayAddress(result.data.gatewayAddress);
          setRewardAddress(result.data.rewardAddress);
          setRegistrationCode(result.data.code);
        }
      }
    } catch (error) {
      console.error('Error loading device config:', error);
    }
  };

  // Get current registration status
  const fetchRegistrationStatus = async () => {
    try {
      const response = await fetch('http://localhost:8716/api/v1/device-status/gateway-status');
      const data = await response.json();

      if (data.isRegistered) {
        // Device is registered, use config data for display
        setRegistrationStatus({
          status: 'registered',
          deviceId: deviceConfig?.deviceId || '',
          deviceName: deviceConfig?.deviceName || '',
          message: 'Device is registered and connected'
        });
      } else {
        setRegistrationStatus({
          status: 'unregistered',
          deviceId: '',
          deviceName: '',
          message: 'Device is not registered'
        });
      }
    } catch (error) {
      console.error('Error fetching registration status:', error);
      setRegistrationStatus({
        status: 'unregistered',
        deviceId: '',
        deviceName: '',
        message: 'Failed to get status'
      });
    }
  };

  const handleRegisterDevice = async () => {
    if (!gatewayAddress || !rewardAddress || !registrationCode) {
      setRegistrationStatus({
        status: 'unregistered',
        deviceId: '',
        deviceName: '',
        message: 'Please fill in all required fields'
      });
      return;
    }

    setIsLoading(true);
    setRegistrationStatus(prev => ({ ...prev, status: 'pending', message: 'Registering device...' }));

    try {
      const response = await fetch('http://localhost:8716/api/v1/device-status/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gateway_address: gatewayAddress,
          reward_address: rewardAddress,
          code: registrationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRegistrationStatus({
          status: 'registered',
          deviceId: data.deviceId || '',
          deviceName: data.deviceName || '',
          message: 'Device registration successful'
        });
        // Refresh registration status and reload config
        await loadDeviceConfig();
        await fetchRegistrationStatus();
      } else {
        setRegistrationStatus({
          status: 'unregistered',
          deviceId: '',
          deviceName: '',
          message: data.error || 'Registration failed'
        });
      }
    } catch (error) {
      console.error('Error registering device:', error);
      setRegistrationStatus({
        status: 'unregistered',
        deviceId: '',
        deviceName: '',
        message: 'Network error, please try again'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize by loading device config first, then registration status
    const initializeData = async () => {
      await loadDeviceConfig();
      await fetchRegistrationStatus();
    };
    initializeData();

    // Periodically update registration status
    const interval = setInterval(() => {
      fetchRegistrationStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Update registration status when device config changes
  useEffect(() => {
    if (deviceConfig) {
      fetchRegistrationStatus();
    }
  }, [deviceConfig]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'unregistered':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'unregistered':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 min-h-0">
      {/* Device Registration Status Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Device Registration Status</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold flex items-center gap-2 ${getStatusColor(registrationStatus.status)}`}>
            {getStatusIcon(registrationStatus.status)}
            {registrationStatus.status === 'registered' ? 'Registered' :
             registrationStatus.status === 'pending' ? 'Registering' : 'Not Registered'}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {registrationStatus.message}
          </p>
          {registrationStatus.deviceId && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                Device ID: {registrationStatus.deviceId}
              </p>
              {registrationStatus.deviceName && (
                <p className="text-xs text-muted-foreground">
                  Device Name: {registrationStatus.deviceName}
                </p>
              )}
            </div>
          )}
          {deviceConfig && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                Gateway: {deviceConfig.gatewayAddress}
              </p>
              <p className="text-xs text-muted-foreground">
                Reward Address: {deviceConfig.rewardAddress}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Device Registration
          </CardTitle>
          <CardDescription>Register device to gateway to start using services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Registration Code *</label>
              <input
                type="text"
                value={registrationCode}
                onChange={(e) => setRegistrationCode(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="Enter one-time registration code"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Gateway Address *</label>
              <input
                type="url"
                value={gatewayAddress}
                onChange={(e) => setGatewayAddress(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="https://gateway.sightai.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reward Address *</label>
              <input
                type="text"
                value={rewardAddress}
                onChange={(e) => setRewardAddress(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="Enter reward receiving address"
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleRegisterDevice}
              disabled={isLoading || registrationStatus.status === 'pending'}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Server className="h-4 w-4" />
              )}
              {isLoading ? 'Registering...' : 'Register Device'}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
