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
    { id: 'dashboard' as Page, label: 'Dashboard', icon: '📊' },
    { id: 'device' as Page, label: 'Device Registration', icon: '📱' },
    { id: 'model' as Page, label: 'Model Reporting', icon: '🤖' },
    { id: 'logs' as Page, label: 'Log Viewer', icon: '📋' },
    { id: 'settings' as Page, label: 'Settings', icon: '⚙️' },
  ];

  return (
    <header className="header">
      <div className="header-brand">
        <h1>SightAI Desktop</h1>
        <div className={`status-indicator ${backendStatus.isRunning ? 'running' : 'stopped'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            Backend Service {backendStatus.isRunning ? 'Running' : 'Stopped'}
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
