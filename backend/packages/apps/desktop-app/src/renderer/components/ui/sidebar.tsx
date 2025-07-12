import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Menu, X } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  level: number;
  isActive?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  isExpandable: boolean;
  isExpanded: boolean;
  items: NavItem[];
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', level: 0 },
  { id: 'device-registration', label: 'Device Registration', level: 0 },
  { id: 'model-configuration', label: 'Model Configuration', level: 0 },
  { id: 'earnings', label: 'Earnings', level: 1 },
  { id: 'gateway-configuration', label: 'Gateway Configuration', level: 1 },
  { id: 'communication', label: 'Communication', level: 1 },
  { id: 'did-management', label: 'DID Management', level: 1 },
  { id: 'settings', label: 'Settings', level: 1 },
];

// const modularConfigSection: NavSection = {
//   id: 'modular-configuration',
//   title: 'Modular Configuration',
//   isExpandable: true,
//   isExpanded: true,
//   items: [
//     // { id: 'tasks', label: 'Tasks', level: 1 },
//     { id: 'earnings', label: 'Earnings', level: 1 },
//     { id: 'gateway-configuration', label: 'Gateway Configuration', level: 1 },
//     { id: 'communication', label: 'Communication', level: 1 },
//     { id: 'did-management', label: 'DID Management', level: 1 },
//     { id: 'settings', label: 'Settings', level: 1 },
//   ],
// };

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'modular-configuration': true,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleItemClick = (itemId: string) => {
    onTabChange(itemId);
    // 在移动端选择项目后关闭侧边栏
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  // 移动端遮罩层
  const MobileOverlay = () => (
    isMobile && isOpen ? (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={() => setIsOpen(false)}
      />
    ) : null
  );

  // 切换按钮
  const ToggleButton = () => (
    <button
      onClick={toggleSidebar}
      className={cn(
        "fixed top-4 z-50 p-2 bg-white rounded-md shadow-md border border-gray-200 hover:bg-gray-50 transition-all duration-200",
        isMobile ? "left-4" : isCollapsed ? "left-4" : "left-56"
      )}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {isMobile ? (
        isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />
      ) : (
        isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <>
      <MobileOverlay />
      <ToggleButton />
      <div className={cn(
        "flex flex-col bg-white transition-all duration-300 ease-in-out relative z-50",
        // 响应式宽度设置
        isMobile
          ? cn(
            "fixed left-0 top-0 h-full shadow-lg transform",
            isOpen ? "translate-x-0" : "-translate-x-full",
            "w-64"
          )
          : cn(
            "relative h-screen",
            isCollapsed ? "w-16" : "w-56 lg:w-64"
          ),
        className
      )}>

        {/* Sidebar Navigation Bar */}
        <div className={cn(
          "flex flex-col gap-4 px-4 pt-16 pb-1 transition-all duration-300",
          isCollapsed && !isMobile ? "px-2" : "px-4"
        )}>
          {/* Title */}
          <div className={cn(
            "flex flex-col px-2 py-1 transition-all duration-300",
            isCollapsed && !isMobile ? "items-center" : ""
          )}>
            <h1
              className={cn(
                "text-black font-bold text-left transition-all duration-300",
                isCollapsed && !isMobile ? "text-lg" : "text-2xl lg:text-3xl"
              )}
              style={{
                fontFamily: 'SF Pro',
                fontWeight: 700,
                lineHeight: '1.206em',
                letterSpacing: '0.01176em'
              }}
            >
              {isCollapsed && !isMobile ? "S.AI" : "SIGHT.AI"}
            </h1>
            {(!isCollapsed || isMobile) && (
              <>
                <p
                  className="text-black text-left truncate text-xs lg:text-sm"
                  style={{
                    fontFamily: 'Menlo',
                    fontWeight: 400,
                    lineHeight: '1.571em',
                    maxWidth: '100%'
                  }}
                >
                  Neutral Interface v2.0
                </p>
                <p
                  className="text-green-500 text-left text-xs lg:text-sm"
                  style={{
                    fontFamily: 'Menlo',
                    fontWeight: 400,
                    lineHeight: '1.571em',
                    color: '#2AE500'
                  }}
                >
                  System Active
                </p>
              </>
            )}
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex flex-col flex-1 mt-6 overflow-y-auto">

          {/* Main Navigation Items */}
          {mainNavItems.map((item) => (
            <div key={item.id} className="flex flex-col pb-3">
              <div className={cn(
                "flex justify-stretch items-stretch transition-all duration-300",
                isCollapsed && !isMobile ? "px-2" : "px-4"
              )}>
                <div
                  className={cn(
                    "flex items-center flex-1 gap-2 px-2 py-2 cursor-pointer rounded-lg transition-colors duration-200 hover:bg-gray-50",
                    activeTab === item.id ? "bg-blue-50 text-[#6750A4]" : "text-black",
                    isCollapsed && !isMobile ? "justify-center" : "justify-start"
                  )}
                  onClick={() => handleItemClick(item.id)}
                  title={isCollapsed && !isMobile ? item.label : undefined}
                >
                  {(!isCollapsed || isMobile) && (
                    <div className="flex items-center gap-2.5 flex-1">
                      <span
                        className={cn(
                          "text-left transition-all duration-300",
                          "text-sm lg:text-base"
                        )}
                        style={{
                          fontFamily: 'SF Pro',
                          fontWeight: 590,
                          lineHeight: '1.294em',
                          letterSpacing: '-0.025em',
                          color: activeTab === item.id ? '#096DD9' : '#000000'
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  )}
                  {isCollapsed && !isMobile && (
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Modular Configuration Section */}
          {/* {(!isCollapsed || isMobile) && (
            <div className="flex flex-col pb-3">
              <div className={cn(
                "pb-0.5 transition-all duration-300",
                isCollapsed && !isMobile ? "px-2" : "px-4"
              )}>
                <div
                  className="flex justify-between items-center gap-0.5 px-2 py-2 cursor-pointer hover:bg-gray-50 rounded-lg"
                  onClick={() => toggleSection('modular-configuration')}
                >
                  <h3
                    className={cn(
                      "text-left flex-1 transition-all duration-300",
                      "text-sm lg:text-base"
                    )}
                    style={{
                      fontFamily: 'SF Pro',
                      fontWeight: 590,
                      lineHeight: '1.294em',
                      letterSpacing: '-0.025em',
                      color: '#000000'
                    }}
                  >
                    {modularConfigSection.title}
                  </h3>
                  <div className="flex justify-center items-center gap-2.5 px-0 pt-0.5 w-3.5">
                    <span
                      className={cn(
                        "text-center transition-transform duration-200",
                        expandedSections['modular-configuration'] ? "rotate-90" : ""
                      )}
                      style={{
                        fontFamily: 'SF Pro',
                        fontWeight: 590,
                        fontSize: '17px',
                        lineHeight: '1.294em',
                        color: '#000000'
                      }}
                    >
                      ▶
                    </span>
                  </div>
                </div>
              </div>

              {expandedSections['modular-configuration'] && modularConfigSection.items.map((item) => (
                <div key={item.id} className={cn(
                  "transition-all duration-300",
                  isCollapsed && !isMobile ? "px-2" : "px-4"
                )}>
                  <div
                    className={cn(
                      "flex items-center flex-1 gap-2 px-2 pl-5 py-2 cursor-pointer rounded-lg transition-colors duration-200",
                      activeTab === item.id ? "bg-blue-50" : "hover:bg-gray-50"
                    )}
                    onClick={() => handleItemClick(item.id)}
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <span
                        className={cn(
                          "text-left transition-all duration-300",
                          "text-xs lg:text-sm"
                        )}
                        style={{
                          fontFamily: 'SF Pro',
                          fontWeight: activeTab === item.id ? 590 : 400,
                          lineHeight: '1.294em',
                          letterSpacing: '-0.025em',
                          color: activeTab === item.id ? '#096DD9' : '#000000'
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )} */}
        </div>
      </div>
    </>
  );
};
