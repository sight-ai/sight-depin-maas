import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

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
];

const modularConfigSection: NavSection = {
  id: 'modular-configuration',
  title: 'Modular Configuration',
  isExpandable: true,
  isExpanded: true,
  items: [
    // { id: 'tasks', label: 'Tasks', level: 1 },
    { id: 'earnings', label: 'Earnings', level: 1 },
    { id: 'gateway-configuration', label: 'Gateway Configuration', level: 1 },
    { id: 'communication', label: 'Communication', level: 1 },
    { id: 'did-management', label: 'DID Management', level: 1 },
    { id: 'settings', label: 'Settings', level: 1 },
  ],
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'modular-configuration': true,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleItemClick = (itemId: string) => {
    onTabChange(itemId);
  };

  return (
    <div className={cn(
      "flex flex-col bg-white",
      className
    )} style={{ minWidth: '200px', maxWidth: '280px', width: '220px', height: '100vh' }}>

      {/* Sidebar Navigation Bar */}
      <div className="flex flex-col gap-4 px-4 pt-7 pb-1">
        {/* Search Bar */}
        {/* <div className="flex justify-stretch items-stretch gap-1 bg-gray-100 rounded-lg">
          <div className="flex items-center flex-1 gap-[-16px] p-1">
            <div className="flex items-center flex-1 gap-2.5 px-5">
              <input
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="bg-transparent border-none outline-none text-base text-gray-700 placeholder-gray-700 flex-1"
                style={{ fontFamily: 'Roboto', fontSize: '16px', lineHeight: '1.5em', letterSpacing: '0.03125em' }}
              />
            </div>
            <div className="flex justify-end items-center absolute right-64 top-[-2px]">
              <div className="flex justify-center items-center w-12 h-12">
                <div className="flex flex-col justify-center items-center w-10 rounded-full">
                  <div className="flex justify-center items-center flex-1 w-full h-10">
                    <div className="w-6 h-6">
                      <img
                        src={require('../../assets/icons/search-icon.svg')}
                        alt="Search"
                        className="w-full h-full"
                        style={{ filter: 'brightness(0) saturate(100%) invert(29%) sepia(8%) saturate(629%) hue-rotate(201deg) brightness(95%) contrast(93%)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> */}

        {/* Title */}
        <div className="flex flex-col px-2 py-1 mt-7">
          <h1
            className="text-black font-bold text-left"
            style={{
              fontFamily: 'SF Pro',
              fontWeight: 700,
              fontSize: '34px',
              lineHeight: '1.206em',
              letterSpacing: '0.01176em'
            }}
          >
            SIGHT.AI
          </h1>
          <p
            className="text-black text-left truncate"
            style={{
              fontFamily: 'Menlo',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '1.571em',
              maxWidth: '100%',
              height: '22px'
            }}
          >
            Neutral Interface v2.0
          </p>
          <p
            className="text-green-500 text-left w-74 h-5.5"
            style={{
              fontFamily: 'Menlo',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '1.571em',
              color: '#2AE500',
              width: '296px',
              height: '22px'
            }}
          >
            System Active
          </p>
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex flex-col flex-1 mt-6">

        {/* Main Navigation Items */}
        {mainNavItems.map((item) => (
          <div key={item.id} className="flex flex-col pb-3 h-11">
            <div className="flex justify-stretch items-stretch px-4">
              {/* { activeTab } {item.id} */}
              <div
                className={cn(
                  "flex justify-center items-center flex-1 gap-2 px-2 cursor-pointer rounded-lg transition-colors duration-200",
                  activeTab === item.id ? " text-[#6750A4]" : "text-black "
                )}
                onClick={() => handleItemClick(item.id)}
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <span
                    className="text-left"
                    style={{
                      fontFamily: 'SF Pro',
                      fontWeight: 590,
                      fontSize: '15px',
                      lineHeight: '1.294em',
                      letterSpacing: '-0.025em',
                      color: activeTab === item.id ? '#096DD9' : '#000000'
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 py-3">
                  {/* Trailing space for consistency */}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Modular Configuration Section */}
        <div className="flex flex-col pb-3">
          {/* Section Header */}
          <div className="px-4 pb-0.5">
            <div
              className="flex justify-between items-center gap-0.5 px-2 py-2 cursor-pointer"
              onClick={() => toggleSection('modular-configuration')}
            >
              <h3
                className="text-left flex-1"
                style={{
                  fontFamily: 'SF Pro',
                  fontWeight: 590,
                  fontSize: '15px',
                  lineHeight: '1.294em',
                  letterSpacing: '-0.025em',
                  color: '#000000',
                  width: '252px'
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

          {/* Section Items */}
          {expandedSections['modular-configuration'] && modularConfigSection.items.map((item) => (
            <div key={item.id} className="px-4 w-80 h-11">
              <div
                className={cn(
                  "flex justify-center items-center flex-1 gap-2 px-2 pl-5 cursor-pointer rounded-lg transition-colors duration-200",
                  activeTab === item.id ? "bg-blue-50" : "hover:bg-gray-50"
                )}
                onClick={() => handleItemClick(item.id)}
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <span
                    className="text-left"
                    style={{
                      fontFamily: 'SF Pro',
                      fontWeight: activeTab === item.id ? 590 : 400,
                      fontSize: '14px',
                      lineHeight: '1.294em',
                      letterSpacing: '-0.025em',
                      color: activeTab === item.id ? '#096DD9' : '#000000'
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 py-3">
                  {/* Trailing space for consistency */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
