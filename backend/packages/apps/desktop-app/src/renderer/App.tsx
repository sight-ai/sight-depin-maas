import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/ui/sidebar';
import { CyberDashboard } from './components/CyberDashboard';
import { CyberTaskModule } from './components/CyberTaskModule';
import { CyberModelInference } from './components/CyberModelInference';
import { ConnectionSettings } from './components/ConnectionSettings';
import { ModelReporting } from './components/ModelReporting';
import { NewSettings } from './components/NewSettings';

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
        return <CyberDashboard backendStatus={backendStatus} />;
      case 'tasks':
        return <CyberTaskModule backendStatus={backendStatus} />;
      case 'inference':
        return <CyberModelInference backendStatus={backendStatus} />;
      case 'model':
        return <ModelReporting />;
      case 'connection':
        return <ConnectionSettings />;
      case 'new-settings':
        return <NewSettings />;
      default:
        return <CyberDashboard backendStatus={backendStatus} />;
    }
  };

  return (
    <div className="app">
      {/* Cyberpunk Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Animated scan lines */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              style={{
                top: `${20 + i * 20}%`,
                animation: `scan-line ${3 + i * 0.5}s linear infinite`,
                animationDelay: `${i * 0.5}s`
              }}
            />
          ))}
        </div>

        {/* Floating data particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `particle-float ${5 + Math.random() * 5}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex h-screen bg-background relative z-10">
        {/* Cyberpunk Sidebar */}
        <div className="cyber-sidebar">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="cyber-sidebar"
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Cyberpunk Header */}
          <header className="border-b border-cyan-500/20 bg-card/50 backdrop-blur-sm px-6 py-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-magenta-500/5" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-cyan-400 font-mono text-sm">SIGHTAI_SYSTEM</span>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  STATUS: {backendStatus.isRunning ? (
                    <span className="status-online">ONLINE [PORT:{backendStatus.port}]</span>
                  ) : (
                    <span className="status-offline">OFFLINE</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
                <span>{new Date().toLocaleTimeString()}</span>
                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
              </div>
            </div>
          </header>

          {/* Main Content with Cyberpunk styling */}
          <main className="flex-1 overflow-auto relative">
            <div className="p-6 relative z-10">
              <div className="cyber-card p-6 min-h-full">
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
