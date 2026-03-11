import React, { useState } from 'react';

interface DashboardCustomersProps {
  customers: any[];
  isLoading: boolean;
}

const DashboardCustomers: React.FC<DashboardCustomersProps> = ({ customers, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-light rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-brand-primary/30 rounded-xl mb-2"></div>
                <div className="h-3 bg-brand-light rounded-xl"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border-2 border-brand-primary/20 focus:border-brand-primary focus:outline-none"
        />
      </div>

      {/* Customers List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 shadow-honey border-4 border-brand-primary/20 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-black text-brand-black mb-2">No customers found</h3>
            <p className="text-gray-500">Try adjusting your search.</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20 hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center font-bold text-brand-black">
                    {customer.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-black">
                      {customer.name || 'Unknown Customer'}
                    </h4>
                    <p className="text-sm text-gray-500">{customer.email || 'No email'}</p>
                    <p className="text-sm text-gray-500">{customer.phone || 'No phone'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mb-2">
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-xl font-black text-brand-black">
                      {customer.totalOrders || 0}
                    </p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-lg font-bold text-brand-black">
                      ₹{customer.totalSpent || 0}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded-xl text-sm font-bold ${
                        customer.isActive
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-brand-primary/20 flex gap-2">
                <button className="px-4 py-2 bg-brand-primary text-brand-black rounded-xl font-bold hover:scale-105 transition-transform">
                  View Orders
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:scale-105 transition-transform">
                  Send Email
                </button>
                {customer.isActive ? (
                  <button className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:scale-105 transition-transform">
                    Deactivate
                  </button>
                ) : (
                  <button className="px-4 py-2 bg-green-100 text-green-600 rounded-xl font-bold hover:scale-105 transition-transform">
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DashboardCustomers;
