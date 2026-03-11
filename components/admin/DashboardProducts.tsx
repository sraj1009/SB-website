import React, { useState } from 'react';

interface DashboardProductsProps {
  products: any[];
  isLoading: boolean;
}

const DashboardProducts: React.FC<DashboardProductsProps> = ({ products, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20 animate-pulse"
          >
            <div className="h-32 bg-brand-light rounded-xl mb-4"></div>
            <div className="h-4 bg-brand-primary/30 rounded-xl mb-2"></div>
            <div className="h-6 bg-brand-primary/30 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  const categories = ['all', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.author?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border-2 border-brand-primary/20 focus:border-brand-primary focus:outline-none"
            />
          </div>
          <div className="min-w-[150px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border-2 border-brand-primary/20 focus:border-brand-primary focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
          <button className="px-6 py-2 bg-brand-primary text-brand-black rounded-xl font-bold hover:scale-105 transition-transform">
            + Add Product
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white rounded-[2rem] p-12 shadow-honey border-4 border-brand-primary/20 text-center">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-black text-brand-black mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-[2rem] p-6 shadow-honey border-4 border-brand-primary/20 hover:scale-105 transition-transform"
            >
              <div className="aspect-square bg-brand-light rounded-xl mb-4 flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-4xl">📚</span>
                )}
              </div>

              <h3 className="font-bold text-brand-black mb-2 line-clamp-2">
                {product.title || 'Untitled Product'}
              </h3>
              <p className="text-sm text-gray-500 mb-2">{product.author || 'Unknown Author'}</p>

              <div className="flex items-center justify-between mb-4">
                <span className="text-xl font-black text-brand-black">₹{product.price || '0'}</span>
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    product.stock > 10
                      ? 'bg-green-100 text-green-600'
                      : product.stock > 0
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-red-100 text-red-600'
                  }`}
                >
                  Stock: {product.stock || 0}
                </span>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-brand-primary text-brand-black rounded-xl font-bold hover:scale-105 transition-transform text-sm">
                  Edit
                </button>
                <button className="flex-1 px-3 py-2 bg-red-500 text-white rounded-xl font-bold hover:scale-105 transition-transform text-sm">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DashboardProducts;
