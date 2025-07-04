import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/ui/sidebar';
import { SystemManagement } from './components/SystemManagement';
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
    // 检查后端状态
    const checkBackendStatus = async () => {
      try {
        if (window.electronAPI) {
          const status = await window.electronAPI.getBackendStatus();
          setBackendStatus(status);

          // 如果后端服务已启动，结束初始化状态
          if (status.isRunning && isInitializing) {
            setIsInitializing(false);
          }
        }
      } catch (error) {
        console.error('Failed to get backend status:', error);
      }
    };

    // 初始检查
    checkBackendStatus();

    // 监听后端状态变化事件
    if (window.electronAPI) {
      window.electronAPI.onBackendStatusChange((status) => {
        setBackendStatus(status);
        if (status.isRunning && isInitializing) {
          setIsInitializing(false);
        }
      });
    }

    // 定期检查后端状态作为备用
    const interval = setInterval(checkBackendStatus, 5000);

    return () => clearInterval(interval);
  }, [isInitializing]);

  const handleRestartBackend = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.restartBackend();
        // 等待一段时间后重新检查状态
        setTimeout(async () => {
          const status = await window.electronAPI.getBackendStatus();
          setBackendStatus(status);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to restart backend:', error);
    }
  };

  // 如果正在初始化，显示加载屏幕
  if (isInitializing) {
    return (
      <div className="app loading-screen">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>SightAI Desktop 正在启动</h2>
          <p>正在启动后端服务，请稍候...</p>
          <div className="loading-status">
            <div className={`status-indicator ${backendStatus.isRunning ? 'success' : 'loading'}`}>
              {backendStatus.isRunning ? '✅ 后端服务已就绪' : '⏳ 正在启动后端服务...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'system':
        return <SystemManagement backendStatus={backendStatus} onRestartBackend={handleRestartBackend} />;
      case 'model':
        return <ModelReporting />;
      case 'connection':
        return <ConnectionSettings />;
      case 'settings':
        return <Settings onRestartBackend={handleRestartBackend} />;
      default:
        return <SystemManagement backendStatus={backendStatus} onRestartBackend={handleRestartBackend} />;
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
                <h1 className="text-2xl font-bold text-foreground">SightAI Desktop</h1>
                <p className="text-sm text-muted-foreground">
                  后端服务状态: {backendStatus.isRunning ?
                    <span className="text-green-600">运行中 (端口: {backendStatus.port})</span> :
                    <span className="text-red-600">已停止</span>
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
