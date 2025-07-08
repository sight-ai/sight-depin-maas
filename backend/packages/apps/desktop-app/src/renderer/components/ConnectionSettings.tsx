import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  RefreshCw
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
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Form validation states
  const [validationErrors, setValidationErrors] = useState<{
    gatewayAddress?: string;
    rewardAddress?: string;
    registrationCode?: string;
  }>({});

  // Validation functions
  const validateGatewayAddress = (address: string): string | null => {
    if (!address.trim()) {
      return 'Gateway address is required';
    }
    try {
      const url = new URL(address);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Gateway address must use HTTP or HTTPS protocol';
      }
      return null;
    } catch {
      return 'Invalid gateway address format';
    }
  };

  const validateRewardAddress = (address: string): string | null => {
    if (!address.trim()) {
      return 'Reward address is required';
    }
    // Basic validation for common address formats
    if (address.length < 10) {
      return 'Reward address is too short';
    }
    if (address.length > 100) {
      return 'Reward address is too long';
    }
    // Check for valid characters (alphanumeric and common special chars)
    if (!/^[a-zA-Z0-9._-]+$/.test(address)) {
      return 'Reward address contains invalid characters';
    }
    return null;
  };

  const validateRegistrationCode = (code: string): string | null => {
    if (!code.trim()) {
      return 'Registration code is required';
    }
    if (code.length < 6) {
      return 'Registration code must be at least 6 characters';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    const gatewayError = validateGatewayAddress(gatewayAddress);
    if (gatewayError) errors.gatewayAddress = gatewayError;

    const rewardError = validateRewardAddress(rewardAddress);
    if (rewardError) errors.rewardAddress = rewardError;

    const codeError = validateRegistrationCode(registrationCode);
    if (codeError) errors.registrationCode = codeError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Button styling based on state
  const getButtonClass = () => {
    const baseClass = "cyber-button w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-500 transform";

    switch (buttonState) {
      case 'loading':
        return `${baseClass} animate-pulse scale-101 shadow-lg shadow-cyan-400/20 text-white`;
      case 'success':
        return `${baseClass} bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-400/30 scale-101 text-white`;
      case 'error':
        return `${baseClass} bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-400/30 animate-bounce text-white`;
      default:
        return `${baseClass} hover:scale-101`;
    }
  };

  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            REGISTERING...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4" />
            REGISTERED
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4" />
            REGISTRATION FAILED
          </>
        );
      default:
        return (
          <>
            <Server className="h-4 w-4" />
            REGISTER DEVICE
          </>
        );
    }
  };

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

  const getDetailedErrorMessage = (error: any, data?: any): string => {
    // Network/Connection errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return 'Unable to connect to the backend service. Please check if the service is running.';
    }

    // API response errors
    if (data?.error) {
      const errorMsg = data.error.toLowerCase();
      if (errorMsg.includes('gateway')) {
        return 'Gateway connection failed. Please verify the gateway address and network connectivity.';
      }
      if (errorMsg.includes('tunnel')) {
        return 'Tunnel service communication failed. Please check the tunnel service status.';
      }
      if (errorMsg.includes('registration rejected')) {
        return 'Registration was rejected by the gateway. Please verify your registration code.';
      }
      if (errorMsg.includes('timeout')) {
        return 'Registration request timed out. Please check your network connection and try again.';
      }
      if (errorMsg.includes('invalid')) {
        return 'Invalid registration credentials. Please check your gateway address and registration code.';
      }
      if (errorMsg.includes('failed to process response')) {
        return 'Failed to process gateway response. The gateway may be experiencing issues.';
      }
      if (errorMsg.includes('send failed')) {
        return 'Failed to send registration request. Please check your network connection.';
      }
      return data.error;
    }

    // HTTP status errors
    if (error?.status) {
      switch (error.status) {
        case 400:
          return 'Invalid registration data. Please check your input and try again.';
        case 401:
          return 'Authentication failed. Please verify your registration code.';
        case 403:
          return 'Access denied. Your registration code may be invalid or expired.';
        case 404:
          return 'Registration service not found. Please contact support.';
        case 500:
          return 'Server error occurred during registration. Please try again later.';
        case 503:
          return 'Registration service is temporarily unavailable. Please try again later.';
        default:
          return `Registration failed with status ${error.status}. Please try again.`;
      }
    }

    // Generic error
    return 'Registration failed due to an unexpected error. Please try again.';
  };

  const handleRegisterDevice = async () => {
    // Validate form before submission
    if (!validateForm()) {
      setButtonState('error');
      setRegistrationStatus({
        status: 'unregistered',
        deviceId: '',
        deviceName: '',
        message: 'Please fix validation errors before submitting'
      });
      // Reset button state after 2 seconds
      setTimeout(() => setButtonState('idle'), 2000);
      return;
    }

    setIsLoading(true);
    setButtonState('loading');
    setRegistrationStatus(prev => ({
      ...prev,
      status: 'pending',
      message: 'Connecting to gateway and registering device...'
    }));

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
        setButtonState('success');
        setRegistrationStatus({
          status: 'registered',
          deviceId: data.deviceId || '',
          deviceName: data.deviceName || '',
          message: `Device registered successfully at ${new Date().toLocaleTimeString()}`
        });
        // Refresh registration status and reload config
        await loadDeviceConfig();
        await fetchRegistrationStatus();
        // Reset button state after 3 seconds
        setTimeout(() => setButtonState('idle'), 3000);
      } else {
        const errorMessage = getDetailedErrorMessage(null, data);
        setButtonState('error');
        setRegistrationStatus({
          status: 'unregistered',
          deviceId: '',
          deviceName: '',
          message: errorMessage
        });
        // Reset button state after 5 seconds for error states
        setTimeout(() => setButtonState('idle'), 5000);
      }
    } catch (error) {
      console.error('Error registering device:', error);
      const errorMessage = getDetailedErrorMessage(error);
      setButtonState('error');
      setRegistrationStatus({
        status: 'unregistered',
        deviceId: '',
        deviceName: '',
        message: errorMessage
      });
      // Reset button state after 5 seconds for error states
      setTimeout(() => setButtonState('idle'), 5000);
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
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-cyan-400 font-mono">DEVICE STATUS</h3>
          <Server className="h-5 w-5 text-cyan-400" />
        </div>

        <div className={`text-2xl font-bold flex items-center gap-2 font-mono transition-all duration-500 ${
          registrationStatus.status === 'registered' ? 'text-green-400 animate-pulse' :
          registrationStatus.status === 'pending' ? 'text-yellow-400 animate-pulse' :
          'text-red-400'
        }`}>
          <div className={`transition-transform duration-300 ${
            registrationStatus.status === 'registered' ? 'scale-110' :
            registrationStatus.status === 'pending' ? 'animate-spin' :
            'scale-100'
          }`}>
            {getStatusIcon(registrationStatus.status)}
          </div>
          {registrationStatus.status === 'registered' ? 'REGISTERED' :
           registrationStatus.status === 'pending' ? 'REGISTERING' : 'NOT REGISTERED'}
        </div>

        <div className={`cyber-status-card mt-4 p-4 font-mono text-sm ${
          registrationStatus.status === 'registered'
            ? 'status-registered text-green-400'
            : registrationStatus.status === 'pending'
            ? 'status-pending text-yellow-400'
            : 'status-error text-red-400'
        }`}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {registrationStatus.status === 'registered' && <CheckCircle className="h-4 w-4" />}
              {registrationStatus.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
              {registrationStatus.status === 'unregistered' && <AlertCircle className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {registrationStatus.status === 'registered' && 'SUCCESS'}
                {registrationStatus.status === 'pending' && 'IN PROGRESS'}
                {registrationStatus.status === 'unregistered' && 'ERROR'}
              </div>
              <div className="mt-1 text-xs opacity-90">
                {registrationStatus.message}
              </div>
              {registrationStatus.status === 'unregistered' && (
                <div className="mt-2 text-xs opacity-75">
                  <div className="font-medium mb-1">Troubleshooting steps:</div>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Verify gateway address is correct and accessible</li>
                    <li>Check registration code validity</li>
                    <li>Ensure network connectivity to the gateway</li>
                    <li>Try refreshing the page and registering again</li>
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleRegisterDevice}
                      disabled={isLoading || !gatewayAddress || !rewardAddress || !registrationCode}
                      className="cyber-button size-sm variant-secondary flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      RETRY REGISTRATION
                    </button>
                    <button
                      onClick={fetchRegistrationStatus}
                      className="cyber-button size-sm variant-secondary flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      CHECK STATUS
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {registrationStatus.deviceId && (
          <div className="mt-6 p-4 bg-black/20 rounded border border-cyan-400/20">
            <div className="text-xs font-mono text-cyan-400 mb-2">DEVICE INFORMATION</div>
            <div className="space-y-2">
              <div className="text-sm font-mono">
                <span className="text-cyan-400">Device ID:</span> {registrationStatus.deviceId}
              </div>
              {registrationStatus.deviceName && (
                <div className="text-sm font-mono">
                  <span className="text-cyan-400">Device Name:</span> {registrationStatus.deviceName}
                </div>
              )}
            </div>
          </div>
        )}

        {deviceConfig && (
          <div className="mt-4 p-4 bg-black/20 rounded border border-cyan-400/20">
            <div className="text-xs font-mono text-cyan-400 mb-2">CONFIGURATION</div>
            <div className="space-y-2">
              <div className="text-sm font-mono">
                <span className="text-cyan-400">Gateway:</span> {deviceConfig.gatewayAddress}
              </div>
              <div className="text-sm font-mono">
                <span className="text-cyan-400">Reward Address:</span> {deviceConfig.rewardAddress}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Device Registration Form */}
      <div className="cyber-card p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-magenta-500 to-cyan-400 rounded-lg flex items-center justify-center animate-glow-pulse">
              <User className="h-6 w-6 text-black" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full"></div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-cyan-400 font-mono mb-1">DEVICE REGISTRATION</h3>
            <p className="text-sm text-muted-foreground font-mono opacity-80">
              Connect to the SightAI gateway network
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-magenta-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="cyber-form-field">
            <label className="cyber-form-label required">REGISTRATION CODE</label>
            <input
              type="text"
              value={registrationCode}
              onChange={(e) => {
                setRegistrationCode(e.target.value);
                // Clear validation error when user starts typing
                if (validationErrors.registrationCode) {
                  setValidationErrors(prev => ({ ...prev, registrationCode: undefined }));
                }
              }}
              onBlur={() => {
                const error = validateRegistrationCode(registrationCode);
                if (error) {
                  setValidationErrors(prev => ({ ...prev, registrationCode: error }));
                }
              }}
              className={`cyber-input w-full ${
                validationErrors.registrationCode ? 'error' : ''
              }`}
              placeholder="Enter your one-time registration code..."
              disabled={isLoading}
            />
            {validationErrors.registrationCode && (
              <div className="cyber-error-message">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{validationErrors.registrationCode}</span>
              </div>
            )}
          </div>

          <div className="cyber-form-field">
            <label className="cyber-form-label required">GATEWAY ADDRESS</label>
            <input
              type="url"
              value={gatewayAddress}
              onChange={(e) => {
                setGatewayAddress(e.target.value);
                // Clear validation error when user starts typing
                if (validationErrors.gatewayAddress) {
                  setValidationErrors(prev => ({ ...prev, gatewayAddress: undefined }));
                }
              }}
              onBlur={() => {
                const error = validateGatewayAddress(gatewayAddress);
                if (error) {
                  setValidationErrors(prev => ({ ...prev, gatewayAddress: error }));
                }
              }}
              className={`cyber-input w-full ${
                validationErrors.gatewayAddress ? 'error' : ''
              }`}
              placeholder="https://gateway.sightai.com"
              disabled={isLoading}
            />
            {validationErrors.gatewayAddress && (
              <div className="cyber-error-message">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{validationErrors.gatewayAddress}</span>
              </div>
            )}
          </div>

          <div className="cyber-form-field">
            <label className="cyber-form-label required">REWARD ADDRESS</label>
            <input
              type="text"
              value={rewardAddress}
              onChange={(e) => {
                setRewardAddress(e.target.value);
                // Clear validation error when user starts typing
                if (validationErrors.rewardAddress) {
                  setValidationErrors(prev => ({ ...prev, rewardAddress: undefined }));
                }
              }}
              onBlur={() => {
                const error = validateRewardAddress(rewardAddress);
                if (error) {
                  setValidationErrors(prev => ({ ...prev, rewardAddress: error }));
                }
              }}
              className={`cyber-input w-full ${
                validationErrors.rewardAddress ? 'error' : ''
              }`}
              placeholder="Enter your reward receiving address..."
              disabled={isLoading}
            />
            {validationErrors.rewardAddress && (
              <div className="cyber-error-message">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{validationErrors.rewardAddress}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gradient-to-r from-transparent via-cyan-400/30 to-transparent relative">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          </div>
          <button
            onClick={handleRegisterDevice}
            disabled={isLoading || registrationStatus.status === 'pending' || buttonState === 'loading'}
            className={getButtonClass()}
          >
            {getButtonContent()}
          </button>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground font-mono opacity-60">
              Registration will connect your device to the SightAI network
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
