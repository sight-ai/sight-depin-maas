import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/ui/sidebar';
import { CyberModelInference } from './components/CyberModelInference';
import { ModelReporting } from './components/ModelReporting';
import { CyberDashboard } from './components/Dashboard';
import { Earnings } from './components/Earnings';
import { GatewayConfiguration } from './components/GatewayConfiguration';
import { Communication } from './components/Communication';
import { Settings } from './components/Settings';
import { DeviceRegistration } from './components/DeviceRegistration';
import { DIDManagement } from './components/DIDManagement';

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

const App: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    isRunning: false,
    port: 8716,
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Check backend status
    const checkBackendStatus = async () => {
      try {
        if (window.electronAPI) {
          const status = await window.electronAPI.getBackendStatus();
          setBackendStatus(status);

          // End initialization state if backend service is started
          if (status.isRunning && isInitializing) {
            setIsInitializing(false);
          }
        }
      } catch (error) {
        console.error('Failed to get backend status:', error);
      }
    };

    // Initial check
    checkBackendStatus();

    // Listen for backend status change events
    if (window.electronAPI) {
      window.electronAPI.onBackendStatusChange((status) => {
        setBackendStatus(status);
        if (status.isRunning && isInitializing) {
          setIsInitializing(false);
        }
      });
    }

    // 🚨 修复：减少后端状态检查频率，从5秒改为15秒
    const interval = setInterval(checkBackendStatus, 15000);

    return () => clearInterval(interval);
  }, [isInitializing]);



  // Show loading screen if initializing
  if (isInitializing) {
    return (
      <div className="app loading-screen">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>SightAI Desktop Starting</h2>
          <p>Starting backend service, please wait...</p>
          <div className="loading-status">
            <div className={`status-indicator ${backendStatus.isRunning ? 'success' : 'loading'}`}>
              {backendStatus.isRunning ? '✅ Backend service ready' : '⏳ Starting backend service...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CyberDashboard backendStatus={backendStatus} />;
      case 'device-registration':
        return <DeviceRegistration backendStatus={backendStatus}/>;
      case 'model-configuration':
        return <ModelReporting />;
      case 'earnings':
        return <Earnings backendStatus={backendStatus} />;
      case 'gateway-configuration':
        return <GatewayConfiguration backendStatus={backendStatus} />;
      case 'communication':
        return <Communication backendStatus={backendStatus} />;
      case 'did-management':
        return <DIDManagement backendStatus={backendStatus} />;
      case 'settings':
        return <Settings backendStatus={backendStatus} />;
      case 'inference': //
        return <CyberModelInference backendStatus={backendStatus} />;
      default:
        return <CyberDashboard backendStatus={backendStatus} />;
    }
  };

  return (
    <div className="app">
      {/* Clean Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Pure white background */}
        <div className="absolute inset-0 bg-white" />
      </div>

      <div className="flex h-screen bg-background relative z-10">
        {/* Responsive Sidebar */}
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="cyber-sidebar"
          />
        </div>

        {/* Main Content Area - 响应式适配 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Draggable Header - 响应式适配 */}
          <div
            className="h-8 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6"
            style={{
              WebkitAppRegion: 'drag',
              userSelect: 'none'
            } as React.CSSProperties}
          >
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600 font-medium hidden sm:inline">SIGHT.AI</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {backendStatus.isRunning ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Main Content with responsive styling */}
          <main
            className="flex-1 overflow-auto relative"
            style={{
              WebkitAppRegion: 'no-drag'
            } as React.CSSProperties}
          >
            <div className="relative z-10 w-full">
              <div className="responsive-container min-h-full py-2 sm:py-4 lg:py-6">
                {renderContent()}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
