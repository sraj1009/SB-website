import React from 'react';

interface DashboardOverviewProps {
  stats: any;
  isLoading: boolean;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20 animate-pulse"
          >
            <div className="h-4 bg-brand-light rounded-xl mb-4"></div>
            <div className="h-8 bg-brand-primary/30 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${stats?.totalRevenue?.toLocaleString() || '0'}`,
      icon: '💰',
      change: '+12.5%',
      positive: true,
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders?.toLocaleString() || '0',
      icon: '📦',
      change: '+8.2%',
      positive: true,
    },
    {
      title: 'Active Customers',
      value: stats?.activeCustomers?.toLocaleString() || '0',
      icon: '👥',
      change: '+5.1%',
      positive: true,
    },
    {
      title: 'Products',
      value: stats?.totalProducts?.toLocaleString() || '0',
      icon: '🛍️',
      change: '+2.3%',
      positive: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20 hover:scale-105 transition-transform"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{stat.icon}</span>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-xl ${
                  stat.positive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-2">{stat.title}</h3>
            <p className="text-2xl font-black text-brand-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20">
        <h3 className="text-xl font-black text-brand-black mb-6 flex items-center gap-3">
          <span>📋</span> Recent Orders
        </h3>
        <div className="space-y-4">
          {stats?.recentOrders?.slice(0, 5).map((order: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-brand-light rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center font-bold text-brand-black">
                  #{order.id?.slice(-4) || '0000'}
                </div>
                <div>
                  <p className="font-bold text-brand-black">
                    {order.customerName || 'Unknown Customer'}
                  </p>
                  <p className="text-sm text-gray-500">₹{order.total || '0'}</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-xl text-sm font-bold ${
                  order.status === 'completed'
                    ? 'bg-green-100 text-green-600'
                    : order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-red-100 text-red-600'
                }`}
              >
                {order.status || 'pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats?.lowStockProducts?.length > 0 && (
        <div className="bg-yellow-50 border-4 border-yellow-200 rounded-[2rem] p-6">
          <h3 className="text-xl font-black text-yellow-800 mb-4 flex items-center gap-3">
            <span>⚠️</span> Low Stock Alert
          </h3>
          <div className="space-y-2">
            {stats.lowStockProducts.slice(0, 3).map((product: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-xl"
              >
                <span className="font-medium text-yellow-800">{product.title}</span>
                <span className="text-sm font-bold text-yellow-600">Stock: {product.stock}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
