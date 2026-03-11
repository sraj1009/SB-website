// Example Component Integration Patterns for SINGGLEBEE API Services

import React, { useState } from 'react';
import { useAuth, useLogin, useRegister } from '../hooks/useAuth';
import { useCartManager, useCartSummary } from '../hooks/useCart';
import { useProducts, useProductFilters } from '../hooks/useProductsQuery';
import { useOrders } from '../hooks/useOrders';
import { useOrderManager, useOrderActions } from '../hooks/useOrders';
import { useReviewManager, useReviewForm } from '../hooks/useReviews';
import { useAdminDashboard, useProductManagement } from '../hooks/useAdmin';

// Example 1: Authentication Component
export function AuthComponent() {
  const { isAuthenticated, user, login, register, logout } = useAuth();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isLoginMode) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await register({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        });
      }
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (isAuthenticated) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Welcome, {user?.fullName}! 🐝</h2>
        <p className="text-gray-600 mb-4">Email: {user?.email}</p>
        <p className="text-gray-600 mb-4">Role: {user?.role}</p>
        <button
          onClick={() => logout()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLoginMode ? 'Login' : 'Register'} to SINGGLEBEE
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLoginMode && (
          <input
            type="text"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        />

        <button
          type="submit"
          disabled={loginMutation.isPending || registerMutation.isPending}
          className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
        >
          {loginMutation.isPending || registerMutation.isPending
            ? 'Processing...'
            : isLoginMode
              ? 'Login'
              : 'Register'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={() => setIsLoginMode(!isLoginMode)}
          className="text-amber-600 hover:underline"
        >
          {isLoginMode ? "Don't have an account? Register" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

// Example 2: Product Listing Component
export function ProductListingComponent() {
  const { filters, updateFilter, clearFilters } = useProductFilters();
  const { data: productsData, isLoading, error } = useProducts(filters);

  const handleCategoryChange = (category: string) => {
    updateFilter('category', category === 'all' ? undefined : category);
  };

  const handlePriceRangeChange = (min: number, max: number) => {
    updateFilter('priceMin', min > 0 ? min : undefined);
    updateFilter('priceMax', max > 0 ? max : undefined);
  };

  if (isLoading) return <div className="text-center py-8">Loading products...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error loading products</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Tamil Educational Books 📚</h2>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Categories</option>
              <option value="books">Books</option>
              <option value="poems">Poems</option>
              <option value="stories">Stories</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                onChange={(e) =>
                  handlePriceRangeChange(Number(e.target.value), filters.priceMax || 0)
                }
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="number"
                placeholder="Max"
                onChange={(e) =>
                  handlePriceRangeChange(filters.priceMin || 0, Number(e.target.value))
                }
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {productsData?.data?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {productsData?.data?.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No products found matching your criteria.
        </div>
      )}
    </div>
  );
}

// Example 3: Product Card Component
function ProductCard({ product }: { product: any; key?: string }) {
  const { addProduct, isAdding } = useCartManager();

  const addToWishlist = (productId: string) => {
    // Placeholder for wishlist functionality
    console.log('Added to wishlist:', productId);
  };

  const handleAddToCart = () => {
    addProduct(product.id, 1);
  };

  const handleAddToWishlist = () => {
    addToWishlist(product.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.title}</h3>
        <p className="text-gray-600 text-sm mb-2">by {product.author}</p>

        <div className="flex items-center mb-2">
          <span className="text-2xl font-bold text-amber-600">₹{product.price}</span>
          {product.bestseller && (
            <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
              Bestseller
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={isAdding || product.stock === 0}
            className="flex-1 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>

          <button
            onClick={handleAddToWishlist}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            ❤️
          </button>
        </div>
      </div>
    </div>
  );
}

// Example 4: Cart Component
export function CartComponent() {
  const {
    cart,
    summary,
    isLoading,
    updateItemQuantity,
    removeItem,
    clearAllItems,
    applyCouponCode,
    removeAppliedCoupon,
  } = useCartManager();

  const [couponInput, setCouponInput] = useState('');

  const handleQuantityChange = (itemId: string, quantity: number) => {
    updateItemQuantity(itemId, quantity);
  };

  const handleApplyCoupon = () => {
    if (couponInput.trim()) {
      applyCouponCode(couponInput.trim());
      setCouponInput('');
    }
  };

  if (isLoading) return <div className="text-center py-8">Loading cart...</div>;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
        <p className="text-gray-600">Add some Tamil books to get started!</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Shopping Cart 🛒</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onQuantityChange={handleQuantityChange}
              onRemove={removeItem}
            />
          ))}

          <button
            onClick={clearAllItems}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Cart
          </button>
        </div>

        {/* Cart Summary */}
        <div className="bg-gray-50 p-6 rounded-lg h-fit">
          <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{summary?.subtotal || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>₹{summary?.tax || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>{summary?.freeShippingEligible ? 'FREE' : `₹${summary?.shipping || 0}`}</span>
            </div>
            {summary?.discount && summary.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-₹{summary.discount}</span>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span className="text-amber-600">₹{summary?.totalAmount || 0}</span>
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={handleApplyCoupon}
                className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
              >
                Apply
              </button>
            </div>
            {summary?.coupon && (
              <div className="mt-2 flex items-center justify-between bg-green-50 p-2 rounded">
                <span className="text-green-700 text-sm">
                  Coupon: {summary.coupon.code} applied
                </span>
                <button
                  onClick={removeAppliedCoupon}
                  className="text-red-500 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <button className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
  // Example 5: Cart Item Component
  function CartItem({
    item,
    onQuantityChange,
    onRemove,
  }: {
    item: any;
    onQuantityChange: (itemId: string, quantity: number) => void;
    onRemove: (itemId: string) => void;
    key?: string;
  }) {
    return (
      <div className="bg-white p-4 rounded-lg shadow flex gap-4">
        <img
          src={item.product.image}
          alt={item.product.title}
          className="w-20 h-20 object-cover rounded"
        />

        <div className="flex-1">
          <h4 className="font-semibold">{item.product.title}</h4>
          <p className="text-gray-600 text-sm">{item.product.author}</p>
          <p className="text-amber-600 font-semibold">₹{item.product.price}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            className="w-8 h-8 border rounded hover:bg-gray-100"
          >
            -
          </button>
          <span className="w-12 text-center">{item.quantity}</span>
          <button
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
            className="w-8 h-8 border rounded hover:bg-gray-100"
          >
            +
          </button>
        </div>

        <div className="text-right">
          <p className="font-semibold">₹{item.subtotal}</p>
          <button
            onClick={() => onRemove(item.id)}
            className="text-red-500 text-sm hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  // Example 6: Order History Component
  function OrderHistoryComponent() {
    const { data: ordersData, isLoading, error } = useOrders();
    const { cancelOrder, isCancelling } = useOrderManager();

    const handleCancelOrder = (orderId: string) => {
      cancelOrder(orderId, 'Customer requested cancellation');
    };

    if (isLoading) return <div className="text-center py-8">Loading orders...</div>;
    if (error) return <div className="text-center py-8 text-red-500">Error loading orders</div>;

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Order History 📦</h2>

        <div className="space-y-4">
          {ordersData?.data?.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onCancel={handleCancelOrder}
              isCancelling={isCancelling}
            />
          ))}
        </div>

        {ordersData?.data?.length === 0 && (
          <div className="text-center py-8 text-gray-500">You haven't placed any orders yet.</div>
        )}
      </div>
    );
  }

  // Example 7: Order Card Component
  function OrderCard({
    order,
    onCancel,
    isCancelling,
  }: {
    order: any;
    onCancel: (orderId: string) => void;
    isCancelling: boolean;
    key?: string;
  }) {
    const canCancel = order.status === 'pending' || order.status === 'verified';

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg">Order #{order.orderId}</h3>
            <p className="text-gray-600">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                order.status === 'delivered'
                  ? 'bg-green-100 text-green-800'
                  : order.status === 'shipped'
                    ? 'bg-blue-100 text-blue-800'
                    : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <p className="font-semibold text-lg mt-2">₹{order.totalAmount}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                {order.items.length} items • {order.paymentMethod}
              </p>
            </div>
            {canCancel && (
              <button
                onClick={() => onCancel(order.id)}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Example 8: Review Form Component
  function ReviewFormComponent({ productId }: { productId: string }) {
    const { formData, errors, updateField, validateForm, resetForm } = useReviewForm();
    const { createReview, isCreating } = useReviewManager();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      try {
        await createReview({ productId, reviewData: formData });
        resetForm();
      } catch (error) {
        // Error handled by hook
      }
    };

    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Write a Review</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">Rating *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateField('rating', star)}
                  className={`text-2xl ${
                    star <= formData.rating ? 'text-amber-500' : 'text-gray-300'
                  } hover:text-amber-400`}
                >
                  ⭐
                </button>
              ))}
            </div>
            {errors.rating && <p className="text-red-500 text-sm">{errors.rating}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title (Optional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Brief summary of your review"
            />
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium mb-2">Review *</label>
            <textarea
              value={formData.comment}
              onChange={(e) => updateField('comment', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={4}
              placeholder="Share your experience with this book..."
            />
            {errors.comment && <p className="text-red-500 text-sm">{errors.comment}</p>}
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="px-6 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
          >
            {isCreating ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    );
  }

  // Example 9: Admin Dashboard Component
  function AdminDashboardComponent() {
    const { dashboard, health, recentOrders, isLoading } = useAdminDashboard();

    if (isLoading) return <div className="text-center py-8">Loading dashboard...</div>;

    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard 🐝</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Orders"
            value={dashboard?.totalOrders || 0}
            icon="📦"
            color="blue"
          />
          <StatCard
            title="Total Revenue"
            value={`₹${dashboard?.totalRevenue || 0}`}
            icon="💰"
            color="green"
          />
          <StatCard
            title="Total Users"
            value={dashboard?.totalUsers || 0}
            icon="👥"
            color="purple"
          />
          <StatCard
            title="Low Stock Alerts"
            value={dashboard?.lowStockAlerts || 0}
            icon="⚠️"
            color="orange"
          />
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {recentOrders?.slice(0, 5).map((order) => (
              <div key={order.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">Order #{order.orderId}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{order.totalAmount}</p>
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Example 10: Stat Card Component
  function StatCard({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
  }) {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div
            className={`w-12 h-12 ${colorClasses[color as keyof typeof colorClasses]} rounded-full flex items-center justify-center text-white text-xl`}
          >
            {icon}
          </div>
        </div>
      </div>
    );
  }

  // Example 11: Product Management Component
  function ProductManagementComponent() {
    const {
      products,
      pagination,
      isLoading,
      createProduct,
      updateProduct,
      deleteProduct,
      isCreating,
      isUpdating,
      isDeleting,
    } = useProductManagement();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    const handleEdit = (product: any) => {
      setEditingProduct(product);
      setShowCreateForm(true);
    };

    const handleDelete = (productId: string) => {
      if (window.confirm('Are you sure you want to delete this product?')) {
        deleteProduct(productId);
      }
    };

    if (isLoading) return <div className="text-center py-8">Loading products...</div>;

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Product Management</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
          >
            Add New Product
          </button>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-gray-600">{product.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">₹{product.price}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:underline"
                        disabled={isDeleting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Product Form Modal */}
        {showCreateForm && (
          <ProductFormModal
            product={editingProduct}
            onClose={() => {
              setShowCreateForm(false);
              setEditingProduct(null);
            }}
            onSubmit={editingProduct ? updateProduct : createProduct}
            isSubmitting={isCreating || isUpdating}
          />
        )}
      </div>
    );
  }
}

// Example 12: Product Form Modal Component
function ProductFormModal({
  product,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  product?: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    title: product?.title || '',
    author: product?.author || '',
    price: product?.price || '',
    category: product?.category || '',
    description: product?.description || '',
    stock: product?.stock || '',
    isActive: product?.isActive !== false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock),
    };

    if (product) {
      onSubmit({ id: product.id, productData: submitData });
    } else {
      onSubmit(submitData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-6">{product ? 'Edit Product' : 'Add New Product'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Author *</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Price *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Stock *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">Select category</option>
                <option value="books">Books</option>
                <option value="poems">Poems</option>
                <option value="stories">Stories</option>
                <option value="educational">Educational</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                rows={4}
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Product is active
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : product ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Export all components
export {
  AuthComponent,
  ProductListingComponent,
  ProductCard,
  CartComponent,
  CartItem,
  OrderHistoryComponent,
  OrderCard,
  ReviewFormComponent,
  AdminDashboardComponent,
  StatCard,
  ProductManagementComponent,
  ProductFormModal,
};
