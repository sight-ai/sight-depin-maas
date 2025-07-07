import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/ui/sidebar';
import { GlobalStatusView } from './components/GlobalStatusView';
import { TaskModule } from './components/TaskModule';
import { ConnectionSettings } from './components/ConnectionSettings';
import { ModelReporting } from './components/ModelReporting';
import { Settings } from './components/Settings';

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
  const [activeTab, setActiveTab] = useState('system');

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
      case 'system':
        return <GlobalStatusView backendStatus={backendStatus} />;
      case 'tasks':
        return <TaskModule backendStatus={backendStatus} />;
      case 'model':
        return <ModelReporting />;
      case 'connection':
        return <ConnectionSettings />;
      case 'settings':
        return <Settings />;
      default:
        return <GlobalStatusView backendStatus={backendStatus} />;
    }
  };

  return (
    <div className="app">
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Backend Service Status: {backendStatus.isRunning ?
                    <span className="text-green-600">Running (Port: {backendStatus.port})</span> :
                    <span className="text-red-600">Stopped</span>
                  }
                </p>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
