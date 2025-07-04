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
        <h2>系统概览</h2>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>后端服务状态</h3>
          <div className="service-status">
            <div className={`status-badge ${backendStatus.isRunning ? 'running' : 'stopped'}`}>
              {backendStatus.isRunning ? '✅ 运行中' : '❌ 已停止'}
            </div>
            <p>端口: {backendStatus.port}</p>
            {backendStatus.isRunning && (
              <p>
                <a 
                  href={`http://localhost:${backendStatus.port}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.electronAPI) {
                      // 这里可以添加打开外部浏览器的逻辑
                    }
                  }}
                >
                  访问 API 文档
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>系统信息</h3>
          {systemInfo && (
            <div className="system-info">
              <p><strong>平台:</strong> {systemInfo.platform}</p>
              <p><strong>Node.js:</strong> {systemInfo.versions.node}</p>
              <p><strong>Chrome:</strong> {systemInfo.versions.chrome}</p>
              <p><strong>Electron:</strong> {systemInfo.versions.electron}</p>
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h3>快速操作</h3>
          <div className="quick-actions">
            <button className="action-button primary">
              📱 注册新设备
            </button>
            <button className="action-button secondary">
              📊 查看模型报告
            </button>
            <button className="action-button secondary">
              📋 查看日志
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>最近活动</h3>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-time">刚刚</span>
              <span className="activity-text">应用程序启动</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">刚刚</span>
              <span className="activity-text">
                后端服务 {backendStatus.isRunning ? '启动成功' : '启动失败'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
