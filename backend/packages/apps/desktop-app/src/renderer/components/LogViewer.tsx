import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mock log data
    const mockLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: '2024-01-15 10:30:15',
        level: 'info',
        message: 'Application started successfully',
        source: 'main',
      },
      {
        id: '2',
        timestamp: '2024-01-15 10:30:16',
        level: 'info',
        message: 'Backend service starting on port 8716',
        source: 'backend',
      },
      {
        id: '3',
        timestamp: '2024-01-15 10:30:17',
        level: 'warn',
        message: 'GPU memory usage is high (85%)',
        source: 'system',
      },
      {
        id: '4',
        timestamp: '2024-01-15 10:30:18',
        level: 'error',
        message: 'Failed to connect to external API',
        source: 'api',
      },
      {
        id: '5',
        timestamp: '2024-01-15 10:30:19',
        level: 'debug',
        message: 'Processing model inference request',
        source: 'model',
      },
    ];
    setLogs(mockLogs);
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'ℹ️';
      case 'warn':
        return '⚠️';
      case 'error':
        return '❌';
      case 'debug':
        return '🐛';
      default:
        return '📝';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sightai-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="log-viewer">
      <div className="page-header">
        <h2>Log Viewer</h2>
        <p>Real-time view of application and system logs</p>
      </div>

      <div className="log-controls">
        <div className="control-group">
          <label htmlFor="log-filter">Filter Level:</label>
          <select
            id="log-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="log-search">Search:</label>
          <input
            id="log-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search log content..."
          />
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto Scroll
          </label>
        </div>

        <div className="control-actions">
          <button onClick={clearLogs} className="btn-secondary">
            Clear Logs
          </button>
          <button onClick={exportLogs} className="btn-secondary">
            Export Logs
          </button>
        </div>
      </div>

      <div className="log-container">
        <div className="log-list">
          {filteredLogs.map((log) => (
            <div key={log.id} className={`log-entry ${log.level}`}>
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-level">
                <span className="level-icon">{getLevelIcon(log.level)}</span>
                {log.level.toUpperCase()}
              </span>
              <span className="log-source">[{log.source}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      <div className="log-stats">
        <span>Total: {logs.length} logs</span>
        <span>Showing: {filteredLogs.length} logs</span>
      </div>
    </div>
  );
};
