import 'dotenv/config';
import mongoose from 'mongoose';
// Try importing app to see if it throws during module load
try {
  await import('./app.js');
  console.log('App module loaded successfully');
} catch (e) {
  console.error('Failed to load app.js:', e);
  process.exit(1);
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/singglebee';

console.log('Attempting MongoDB connection...');
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('MongoDB Connection Failed:', err);
    process.exit(1);
  });
