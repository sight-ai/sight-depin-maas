import React from 'react';

type Page = 'dashboard' | 'device' | 'model' | 'logs' | 'settings';

interface BackendStatus {
  isRunning: boolean;
  port: number;
}

interface HeaderProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  backendStatus: BackendStatus;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onPageChange,
  backendStatus,
}) => {
  const navItems = [
    { id: 'dashboard' as Page, label: '仪表板', icon: '📊' },
    { id: 'device' as Page, label: '设备注册', icon: '📱' },
    { id: 'model' as Page, label: '模型报告', icon: '🤖' },
    { id: 'logs' as Page, label: '日志查看', icon: '📋' },
    { id: 'settings' as Page, label: '设置', icon: '⚙️' },
  ];

  return (
    <header className="header">
      <div className="header-brand">
        <h1>SightAI Desktop</h1>
        <div className={`status-indicator ${backendStatus.isRunning ? 'running' : 'stopped'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            后端服务 {backendStatus.isRunning ? '运行中' : '已停止'}
          </span>
        </div>
      </div>
      
      <nav className="header-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
