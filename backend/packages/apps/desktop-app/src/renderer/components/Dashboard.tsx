import React, { useState, useEffect } from 'react';

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface DashboardProps {
  backendStatus: BackendStatus;
}

interface SystemInfo {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ backendStatus }) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      setSystemInfo({
        platform: window.electronAPI.platform,
        versions: window.electronAPI.versions,
      });
    }
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>System Overview</h2>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Backend Service Status</h3>
          <div className="service-status">
            <div className={`status-badge ${backendStatus.isRunning ? 'running' : 'stopped'}`}>
              {backendStatus.isRunning ? '✅ Running' : '❌ Stopped'}
            </div>
            <p>Port: {backendStatus.port}</p>
            {backendStatus.isRunning && (
              <p>
                <a
                  href={`http://localhost:${backendStatus.port}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.electronAPI) {
                      // Logic to open external browser can be added here
                    }
                  }}
                >
                  Access API Documentation
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>System Information</h3>
          {systemInfo && (
            <div className="system-info">
              <p><strong>Platform:</strong> {systemInfo.platform}</p>
              <p><strong>Node.js:</strong> {systemInfo.versions.node}</p>
              <p><strong>Chrome:</strong> {systemInfo.versions.chrome}</p>
              <p><strong>Electron:</strong> {systemInfo.versions.electron}</p>
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-time">Just now</span>
              <span className="activity-text">
                Backend service {backendStatus.isRunning ? 'started successfully' : 'failed to start'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
