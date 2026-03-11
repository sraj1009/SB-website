import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DashboardSidebar from './admin/DashboardSidebar';
import DashboardOverview from './admin/DashboardOverview';
import DashboardOrders from './admin/DashboardOrders';
import DashboardProducts from './admin/DashboardProducts';
import DashboardCustomers from './admin/DashboardCustomers';

interface AdminDashboardProps {
  onClose: () => void;
}

type TabType = 'overview' | 'orders' | 'products' | 'customers';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        const data = await api.admin.getStats();
        setStats({
          ...(data.stats || {}),
          ordersByStatus: data.ordersByStatus || {},
          recentOrders: data.recentOrders || [],
          lowStockProducts: data.lowStockProducts || [],
        });
      } else if (activeTab === 'orders') {
        const data = await api.admin.getOrders();
        setOrders(data.orders || []);
      } else if (activeTab === 'products') {
        const data = await api.admin.getProducts();
        setProducts(data.products || []);
      } else if (activeTab === 'customers') {
        const data = await api.admin.getUsers();
        setCustomers(data.users || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderActiveTab = () => {
    if (error) {
      return (
        <div className="bg-red-50 border-4 border-red-200 rounded-[2rem] p-8 text-center">
          <div className="text-6xl mb-4">🚨</div>
          <h3 className="text-xl font-black text-red-800 mb-2">Error loading data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <DashboardOverview stats={stats} isLoading={isLoading} />;
      case 'orders':
        return <DashboardOrders orders={orders} isLoading={isLoading} />;
      case 'products':
        return <DashboardProducts products={products} isLoading={isLoading} />;
      case 'customers':
        return <DashboardCustomers customers={customers} isLoading={isLoading} />;
      default:
        return <DashboardOverview stats={stats} isLoading={isLoading} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentTime={currentTime}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-brand-light overflow-hidden">
        {/* Header */}
        <div className="bg-white rounded-[2rem] shadow-honey border-4 border-brand-primary/20 p-6 m-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-brand-black capitalize">
              {activeTab} Dashboard
            </h1>
            <p className="text-gray-500">Manage your {activeTab} from here</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-red-500 text-white rounded-xl flex items-center justify-center font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">{renderActiveTab()}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
