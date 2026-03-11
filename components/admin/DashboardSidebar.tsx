import React from 'react';

interface TabType {
  id: string;
  label: string;
  icon: string;
}

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentTime: Date;
}

const tabs: TabType[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'orders', label: 'Orders', icon: '📦' },
  { id: 'products', label: 'Products', icon: '🛍️' },
  { id: 'customers', label: 'Customers', icon: '👥' },
];

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  currentTime,
}) => {
  return (
    <div
      className={`${collapsed ? 'w-20' : 'w-64'} bg-white rounded-[2rem] shadow-honey border-4 border-brand-primary/20 p-6 transition-all duration-300 h-fit sticky top-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        {!collapsed && (
          <div>
            <h2 className="text-2xl font-black text-brand-black">Admin Hive</h2>
            <p className="text-sm text-gray-500">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
        >
          <span className="text-brand-black font-bold">{collapsed ? '→' : '←'}</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-brand-primary text-brand-black shadow-honey'
                : 'hover:bg-brand-light text-gray-600 hover:text-brand-black'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {!collapsed && <span>{tab.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DashboardSidebar;
