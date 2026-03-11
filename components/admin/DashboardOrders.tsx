import React, { useState } from 'react';
import api from '../../services/api';

interface DashboardOrdersProps {
  orders: any[];
  isLoading: boolean;
}

interface OrderDetailModalProps {
  order: any;
  onClose: () => void;
  onVerify: (id: string) => void;
  isVerifying: boolean;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onVerify,
  isVerifying,
}) => (
  <div
    className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-[2rem] shadow-2xl border-4 border-brand-primary/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-black text-brand-black">
            Order #{order?.orderId || order?.id?.slice(-6)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 text-sm">
          <p>
            <span className="font-bold">Customer:</span>{' '}
            {order?.user?.fullName || order?.user?.name || order?.customerName || '—'}
          </p>
          <p>
            <span className="font-bold">Email:</span> {order?.user?.email || order?.email || '—'}
          </p>
          <p>
            <span className="font-bold">Status:</span> {order?.status}
          </p>
          <p>
            <span className="font-bold">Payment:</span>{' '}
            {order?.payment?.status || order?.paymentStatus}
          </p>
          <p>
            <span className="font-bold">Total:</span> ₹
            {order?.pricing?.total || order?.total || '0'}
          </p>
          {order?.payment?.proofUrl && (
            <div>
              <span className="font-bold block mb-2">Payment Receipt:</span>
              <a
                href={order.payment.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary underline"
              >
                View receipt
              </a>
            </div>
          )}
        </div>
        {order?.payment?.status !== 'success' && order?.status !== 'cancelled' && (
          <button
            onClick={() => onVerify(order?.id || order?._id)}
            disabled={isVerifying}
            className="mt-6 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:scale-105 disabled:opacity-50"
          >
            {isVerifying ? 'Verifying…' : 'Verify Payment'}
          </button>
        )}
      </div>
    </div>
  </div>
);

const DashboardOrders: React.FC<DashboardOrdersProps> = ({ orders, isLoading }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20 animate-pulse"
          >
            <div className="h-4 bg-brand-light rounded-xl mb-4"></div>
            <div className="h-6 bg-brand-primary/30 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  const filteredOrders = orders.filter((order) => {
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const paymentMatch = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    return statusMatch && paymentMatch;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border-2 border-brand-primary/20 focus:border-brand-primary focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Filter</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border-2 border-brand-primary/20 focus:border-brand-primary focus:outline-none"
            >
              <option value="all">All Payment</option>
              <option value="pending">Payment Pending</option>
              <option value="completed">Payment Completed</option>
              <option value="failed">Payment Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 shadow-honey border-4 border-brand-primary/20 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-black text-brand-black mb-2">No orders found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20 hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center font-bold text-brand-black">
                    #{order.id?.slice(-6) || '000000'}
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-black">
                      {order.customerName || 'Unknown Customer'}
                    </h4>
                    <p className="text-sm text-gray-500">{order.email || 'No email'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-brand-black">₹{order.total || '0'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-sm font-bold ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-600'
                        : order.status === 'shipped'
                          ? 'bg-blue-100 text-blue-600'
                          : order.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-600'
                            : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {order.status || 'pending'}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-xl text-sm font-bold ${
                      order.paymentStatus === 'completed'
                        ? 'bg-green-100 text-green-600'
                        : order.paymentStatus === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-100 text-yellow-600'
                    }`}
                  >
                    {order.paymentStatus || 'pending'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    setLoadingDetail(true);
                    setSelectedOrder(order);
                    try {
                      const id = order.id || order._id;
                      const fullOrder = await api.admin.getOrder(id);
                      setDetailOrder(fullOrder);
                    } catch {
                      setDetailOrder(order);
                    } finally {
                      setLoadingDetail(false);
                    }
                  }}
                  className="px-4 py-2 bg-brand-primary text-brand-black rounded-xl font-bold hover:scale-105 transition-transform"
                >
                  {loadingDetail && selectedOrder?.id === order?.id ? 'Loading…' : 'View Details'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => {
            setDetailOrder(null);
            setSelectedOrder(null);
          }}
          onVerify={async (id) => {
            setVerifying(true);
            try {
              await api.admin.markPaymentComplete(id);
              setDetailOrder({
                ...detailOrder,
                payment: { ...detailOrder.payment, status: 'success' },
              });
            } finally {
              setVerifying(false);
            }
          }}
          isVerifying={verifying}
        />
      )}
    </div>
  );
};

export default DashboardOrders;
