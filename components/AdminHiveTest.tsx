import React, { useState, useEffect } from 'react';

const AdminHiveTest: React.FC = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Test direct API call
    const testAPI = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/products?limit=10');
        const data = await response.json();
        console.log('API Response:', data);
        
        if (response.ok) {
          setProducts(data.data?.products || []);
        } else {
          setError(data.error?.message || 'API Error');
        }
      } catch (err) {
        console.error('API Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Hive Test</h1>
        
        {loading && (
          <div className="bg-white p-6 rounded-lg shadow">
            <p>Loading products...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Products ({products.length})</h2>
          
          {products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product: any) => (
                <div key={product._id} className="border p-4 rounded-lg">
                  <h3 className="font-semibold">{product.name || product.title}</h3>
                  <p className="text-gray-600">Price: ₹{product.price}</p>
                  <p className="text-gray-600">Stock: {product.stockQuantity || product.stock}</p>
                  <p className="text-gray-600">Status: {product.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No products found</p>
          )}
        </div>
        
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Admin Access</h2>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminHiveTest;
