// Test script for SINGGLEBEE checkout workflow
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

async function testCheckoutWorkflow() {
  console.log('🐝 Testing SINGGLEBEE Checkout Workflow...\n');
  
  try {
    // 1. Test Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('✅ Health Check:', healthResponse.data.message);
    
    // 2. Get Products
    console.log('\n2. Getting Products...');
    const productsResponse = await axios.get(`${API_BASE}/products`);
    console.log('✅ Products loaded:', productsResponse.data.data.products.length, 'products');
    
    // 3. Test User Sign In
    console.log('\n3. Testing User Sign In...');
    const signInResponse = await axios.post(`${API_BASE}/auth/signin`, {
      email: 'test@singglebee.com',
      password: 'password123'
    });
    console.log('✅ Sign In successful:', signInResponse.data.data.user.name);
    
    // 4. Create Order
    console.log('\n4. Creating Order...');
    const orderData = {
      items: [
        {
          productId: '1',
          quantity: 2
        }
      ],
      shippingAddress: {
        fullName: 'Test User',
        street: '123 Test Street',
        landmark: 'Near Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        phone: '9999999999',
        email: 'test@singglebee.com'
      },
      paymentMethod: 'upi_manual'
    };
    
    const orderResponse = await axios.post(`${API_BASE}/orders`, orderData);
    console.log('✅ Order created:', orderResponse.data.data._id);
    
    // 5. Create Payment Order
    console.log('\n5. Creating Payment Order...');
    const paymentData = {
      orderId: orderResponse.data.data._id,
      amount: 1198, // 2 * 599
      customerDetails: {
        customerId: 'cust_test123',
        customerEmail: 'test@singglebee.com',
        customerPhone: '9999999999'
      }
    };
    
    const paymentResponse = await axios.post(`${API_BASE}/payments/create-order`, paymentData);
    console.log('✅ Payment Order Created:', paymentResponse.data.data.orderId);
    console.log('   Payment Session ID:', paymentResponse.data.data.orderSession.paymentSessionId);
    
    // 6. Verify Payment
    console.log('\n6. Verifying Payment...');
    const verifyData = {
      orderId: paymentResponse.data.data.orderId,
      paymentId: 'test_payment_' + Date.now(),
      signature: 'test_signature'
    };
    
    const verifyResponse = await axios.post(`${API_BASE}/payments/verify`, verifyData);
    console.log('✅ Payment Verified:', verifyResponse.data.data.status);
    console.log('   Transaction ID:', verifyResponse.data.data.transactionId);
    
    // 7. Get Orders (Check final state)
    console.log('\n7. Checking Order History...');
    const ordersResponse = await axios.get(`${API_BASE}/orders`);
    console.log('✅ Total Orders:', ordersResponse.data.data.orders.length);
    
    console.log('\n🎉 Checkout Workflow Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Health Check: ✅');
    console.log('   - Products API: ✅');
    console.log('   - Auth API: ✅');
    console.log('   - Order Creation: ✅');
    console.log('   - Payment Integration: ✅');
    console.log('   - Payment Verification: ✅');
    console.log('   - Order History: ✅');
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testCheckoutWorkflow();
