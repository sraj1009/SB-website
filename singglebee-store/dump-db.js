const mongoose = require('mongoose');

async function dump() {
    try {
        const conn = await mongoose.connect('mongodb://localhost:27017/singglebee');
        console.log('Connected to MongoDB');

        const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
        const Stock = mongoose.models.Stock || mongoose.model('Stock', new mongoose.Schema({}, { strict: false }));

        const productCount = await Product.countDocuments();
        const stockCount = await Stock.countDocuments();

        console.log(`Products: ${productCount}, Stocks: ${stockCount}`);

        const sampleProducts = await Product.find().limit(3);
        console.log('Sample Products:', JSON.stringify(sampleProducts, null, 2));

        await conn.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dump();
