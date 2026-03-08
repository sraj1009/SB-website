import mongoose from 'mongoose';
import '../models/User.js';
import '../models/Product.js';
import '../models/Order.js';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for migration...');

        const User = mongoose.model('User');
        const Product = mongoose.model('Product');
        const Order = mongoose.model('Order');

        // 1. Migrate Users: fullName -> name
        console.log('Migrating Users...');
        const userResult = await User.collection.updateMany(
            { fullName: { $exists: true }, name: { $exists: false } },
            [{ $set: { name: "$fullName" } }]
        );
        console.log(`Updated ${userResult.modifiedCount} users.`);

        // 2. Migrate Products: title -> name, stockQuantity -> stock
        console.log('Migrating Products...');
        const productResult1 = await Product.collection.updateMany(
            { title: { $exists: true }, name: { $exists: false } },
            [{ $set: { name: "$title" } }]
        );
        const productResult2 = await Product.collection.updateMany(
            { stockQuantity: { $exists: true }, stock: { $exists: false } },
            [{ $set: { stock: "$stockQuantity" } }]
        );
        console.log(`Updated products (names: ${productResult1.modifiedCount}, stock: ${productResult2.modifiedCount}).`);

        // 3. Migrate Orders: pricing.total -> totalAmount, etc.
        console.log('Migrating Orders...');
        const orderResult = await Order.collection.updateMany(
            {},
            [
                {
                    $set: {
                        totalAmount: { $ifNull: ["$totalAmount", "$pricing.total"] },
                        paymentStatus: { $ifNull: ["$paymentStatus", "$payment.status"] },
                        deliveryStatus: { $ifNull: ["$deliveryStatus", "$status"] }
                    }
                }
            ]
        );
        console.log(`Updated ${orderResult.modifiedCount} orders.`);

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
