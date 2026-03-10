import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  CheckCircle,
  Truck,
  AlertCircle,
  Calendar,
  TrendingUp,
  PackageOpen,
  Clock,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Hexagon
} from 'lucide-react';

// TypeScript type definitions for admin dashboard
interface Order {
  id: string;
  customer: string;
  email: string;
  items: number;
  amount: number;
  status: 'pending' | 'verified' | 'shipped' | 'delivered';
  date: string;
  itemsList: string[];
}

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<any>;
  color: string;
  badge?: string;
  warning?: boolean;
}

interface FilterState {
  dateRange: string;
  status: string;
  search: string;
}

const AdminDashboardPremium: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '7days',
    status: 'all',
    search: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const [orders] = useState<Order[]>([
    {
      id: 'ORD-001',
      customer: 'Priya Sharma',
      email: 'priya@example.com',
      items: 3,
      amount: 1299,
      status: 'pending',
      date: '2024-03-10',
      itemsList: ['Tamil Book Set', 'Honey Jar', 'Educational Cards']
    },
    {
      id: 'ORD-002',
      customer: 'Raj Kumar',
      email: 'raj@example.com',
      items: 2,
      amount: 899,
      status: 'verified',
      date: '2024-03-10',
      itemsList: ['Science Books', 'Wild Honey']
    },
    {
      id: 'ORD-003',
      customer: 'Anita Patel',
      email: 'anita@example.com',
      items: 5,
      amount: 2499,
      status: 'shipped',
      date: '2024-03-09',
      itemsList: ['Complete Study Set', 'Honey Collection', 'Art Supplies']
    },
    {
      id: 'ORD-004',
      customer: 'Vikram Singh',
      email: 'vikram@example.com',
      items: 1,
      amount: 599,
      status: 'delivered',
      date: '2024-03-09',
      itemsList: ['Mathematics Guide']
    },
    {
      id: 'ORD-005',
      customer: 'Meera Reddy',
      email: 'meera@example.com',
      items: 4,
      amount: 1899,
      status: 'pending',
      date: '2024-03-08',
      itemsList: ['Language Books', 'Honey Combo', 'Stationery Set']
    }
  ]);

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, active: true },
    { id: 'products', name: 'Products', icon: Package, active: false },
    { id: 'orders', name: 'Orders', icon: ShoppingCart, active: false },
    { id: 'customers', name: 'Customers', icon: Users, active: false },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, active: false },
    { id: 'settings', name: 'Settings', icon: Settings, active: false }
  ];

  // Stats cards data
  const statsCards: StatCard[] = [
    {
      title: 'Total Orders',
      value: '1,247',
      change: '+12.5%',
      icon: ShoppingCart,
      color: 'text-blue-600',
      badge: 'hexagonal'
    },
    {
      title: 'Revenue',
      value: '₹4,89,234',
      change: '+23.1%',
      icon: TrendingUp,
      color: 'text-amber-600',
      badge: 'honey-gold'
    },
    {
      title: 'Low Stock Alerts',
      value: '23',
      change: '+5',
      icon: PackageOpen,
      color: 'text-orange-600',
      warning: true
    },
    {
      title: 'Pending Verifications',
      value: '47',
      change: '-8',
      icon: Clock,
      color: 'text-indigo-600',
      badge: 'info'
    }
  ];

  // Filter orders based on current filters
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.customer.toLowerCase().includes(filters.search.toLowerCase()) ||
                           order.id.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === 'all' || order.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [orders, filters]);

  // Handle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order.id));
    }
  };

  // Handle bulk actions
  const handleExportCSV = () => {
    console.log('Exporting CSV for orders:', selectedOrders);
  };

  const handlePrintLabels = () => {
    console.log('Printing labels for orders:', selectedOrders);
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: Order['status'] }> = ({ status }) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      shipped: { color: 'bg-blue-100 text-blue-800', icon: Truck },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };

    const { color, icon: Icon } = config[status];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white/90 backdrop-blur-xl border-r border-gray-200 transition-all duration-300 ease-in-out h-screen sticky top-0`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center">
                <Hexagon className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-lg font-bold text-gray-900">SINGGLEBEE</h1>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-amber-50 text-amber-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-sm text-gray-600">Manage your inventory and orders</p>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Search className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Filter className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color} bg-opacity-10`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    {stat.badge && (
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stat.badge === 'hexagonal' ? 'bg-blue-100 text-blue-800' :
                        stat.badge === 'honey-gold' ? 'bg-amber-100 text-amber-800' :
                        stat.badge === 'info' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {stat.badge}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    {stat.change && (
                      <p className={`text-xs font-medium ${
                        stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change} from last month
                      </p>
                    )}
                  </div>
                  {stat.warning && (
                    <div className="mt-4 flex items-center gap-2 text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Action required</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Data Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Revenue Chart</p>
                  <p className="text-xs text-gray-500">Honey-gold gradient line graph</p>
                </div>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <div className="text-center">
                  <Hexagon className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Category Chart</p>
                  <p className="text-xs text-gray-500">Hexagonal pie chart</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-lg mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white/85 backdrop-blur-xl rounded-2xl border border-white/30 shadow-lg overflow-hidden">
            {/* Table Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Orders ({filteredOrders.length})</h3>
                {selectedOrders.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedOrders.length} selected
                    </span>
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <button
                      onClick={handlePrintLabels}
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                    >
                      <Printer className="w-4 h-4" />
                      Print Labels
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === filteredOrders.length}
                        onChange={toggleAllOrders}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{order.id}</span>
                          <span className="text-xs text-gray-500">{order.date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{order.customer}</div>
                          <div className="text-sm text-gray-500">{order.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{order.items}</span>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">₹{order.amount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 text-gray-400 hover:text-amber-600 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.status === 'pending' && (
                            <button className="p-1 text-gray-400 hover:text-green-600 transition-colors">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {order.status === 'verified' && (
                            <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                              <Truck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPremium;
