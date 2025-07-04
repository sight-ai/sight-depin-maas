import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Monitor, Brain, Wifi, Settings as SettingsIcon } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: 'system',
    label: '系统管理',
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    id: 'model',
    label: '模型管理',
    icon: <Brain className="h-5 w-5" />,
  },
  {
    id: 'connection',
    label: '连接设置',
    icon: <Wifi className="h-5 w-5" />,
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: <SettingsIcon className="h-5 w-5" />,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <div className={cn(
      "flex flex-col w-64 bg-card border-r border-border",
      className
    )}>
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">SightAI</h2>
        <p className="text-sm text-muted-foreground">桌面管理工具</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-12 text-left",
                activeTab === item.id && "bg-primary text-primary-foreground"
              )}
              onClick={() => onTabChange(item.id)}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p>版本 1.0.0</p>
          <p>© 2024 SightAI</p>
        </div>
      </div>
    </div>
  );
};
