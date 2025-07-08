import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Monitor, Brain, Wifi, Settings as SettingsIcon, Activity, Cpu } from 'lucide-react';

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
    label: 'System Management',
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    id: 'tasks',
    label: 'Task Module',
    icon: <Activity className="h-5 w-5" />,
  },
  {
    id: 'inference',
    label: 'Model Inference',
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    id: 'model',
    label: 'Model Management',
    icon: <Brain className="h-5 w-5" />,
  },
  {
    id: 'connection',
    label: 'Connection Settings',
    icon: <Wifi className="h-5 w-5" />,
  },
  {
    id: 'settings',
    label: 'System Settings',
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
        <p className="text-sm text-muted-foreground">Desktop Management Tool</p>
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
          <p>Version 1.0.0</p>
          <p>© 2025 SightAI</p>
        </div>
      </div>
    </div>
  );
};
