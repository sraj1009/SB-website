import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/singglebee';

console.log('Testing MongoDB connection...');
console.log(`URI: ${MONGODB_URI}`);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`Successfully connected to MongoDB Host: ${conn.connection.host}`);
    console.log('Connection test PASSED.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Connection test FAILED.');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.cause) console.error('Error cause:', error.cause);
    process.exit(1);
  }
};

connectDB();
