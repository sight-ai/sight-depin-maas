import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Monitor, Brain, Wifi, Settings as SettingsIcon, Activity, Cpu, Zap, Shield } from 'lucide-react';

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
    id: 'new-settings',
    label: 'Advanced Settings',
    icon: <Shield className="h-5 w-5" />,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <div className={cn(
      "flex flex-col w-64 bg-card/30 backdrop-blur-sm border-r border-cyan-500/20 relative",
      className
    )}>
      {/* Cyberpunk side glow effect */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-60" />

      {/* Logo/Brand with cyberpunk styling */}
      <div className="p-6 border-b border-cyan-500/20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-magenta-500/10" />
        <div className="relative z-10">
          <div className="flex items-center space-x-2  mt-5">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-magenta-500 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-black" />
            </div>
            <h2 className="text-xl font-bold">SIGHT.AI</h2>
          </div>
          <p className="text-xs text-cyan-400/80 font-mono uppercase tracking-wider">
            Neural Interface v2.0
          </p>
          <div className="mt-2 flex items-center space-x-1">
            <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-mono">SYSTEM ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Navigation with cyberpunk styling */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <div key={item.id} className="relative group">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-12 text-left relative overflow-hidden transition-all duration-300 font-mono",
                  "border border-transparent hover:border-cyan-500/30",
                  "hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-magenta-500/10",
                  activeTab === item.id && [
                    "bg-gradient-to-r from-cyan-500/20 to-magenta-500/20",
                    "border-cyan-500/50 text-cyan-400",
                    "shadow-lg shadow-cyan-500/20"
                  ]
                )}
                onClick={() => onTabChange(item.id)}
              >
                {/* Active indicator */}
                {activeTab === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-magenta-500" />
                )}

                {/* Icon with glow effect */}
                <div className={cn(
                  "transition-all duration-300",
                  activeTab === item.id ? "text-cyan-400" : "text-muted-foreground group-hover:text-cyan-400"
                )}>
                  {item.icon}
                </div>

                {/* Label */}
                <span className={cn(
                  "font-medium transition-all duration-300 text-sm",
                  activeTab === item.id ? "text-cyan-400" : "text-foreground group-hover:text-cyan-400"
                )}>
                  {item.label}
                </span>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>

              {/* Connection line to next item */}
              {index < navItems.length - 1 && (
                <div className="absolute left-6 bottom-0 w-px h-1 bg-cyan-500/20" />
              )}
            </div>
          ))}
        </div>
      </nav>
     
    </div>
  );
};
