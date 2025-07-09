import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/ui/sidebar';
import { CyberTaskModule } from './components/CyberTaskModule';
import { CyberModelInference } from './components/CyberModelInference';
import { ConnectionSettings } from './components/ConnectionSettings';
import { ModelReporting } from './components/ModelReporting';
import { NewSettings } from './components/NewSettings';
import { CyberDashboard } from './components/Dashboard';
import { Earnings } from './components/Earnings';
import { GatewayConfiguration } from './components/GatewayConfiguration';
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

    // Regular backend status check as backup
    const interval = setInterval(checkBackendStatus, 5000);

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
        return <ConnectionSettings />;
      case 'model-configuration':
        return <ModelReporting />;
      case 'tasks':
        return <CyberTaskModule backendStatus={backendStatus} />;
      case 'earnings':
        return <Earnings />;
      case 'gateway-configuration':
        return <GatewayConfiguration />;
      case 'did-management':
        return <DIDManagement />;
      case 'settings':
        return <NewSettings />;
      case 'inference':
        return <CyberModelInference backendStatus={backendStatus} />;
      default:
        return <CyberDashboard backendStatus={backendStatus} />;
    }
  };

  return (
    <div className="app">
      {/* Clean Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30" />
      </div>

      <div className="flex h-screen bg-background relative z-10">
        {/* Clean Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="cyber-sidebar"
          />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Clean Header with drag support */}
          {/* <header className="cyber-header border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-indigo-50/30" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-blue-600 font-medium text-sm">SightAI System</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Status: {backendStatus.isRunning ? (
                    <span className="text-green-600 font-medium">Online [Port: {backendStatus.port}]</span>
                  ) : (
                    <span className="text-red-600 font-medium">Offline</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>{new Date().toLocaleTimeString()}</span>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
              </div>
            </div>
          </header> */}

          {/* Main Content with clean styling */}
          <main className="flex-1 overflow-auto relative">
            <div className="p-6 relative z-10">
              <div className="p-6 min-h-full">
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
