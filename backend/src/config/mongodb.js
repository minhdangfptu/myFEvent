import mongoose from 'mongoose';
import { config } from './environment.js';

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      family: 4,
    };

    const conn = await mongoose.connect(config.MONGODB_URI, options);
    console.log('MongoDB Connected!');

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    const graceful = async (signal) => {
      try {
        await mongoose.connection.close();
        console.log(`MongoDB connection closed (${signal})`);
      } finally {
        process.exit(0);
      }
    };
    process.on('SIGINT', () => graceful('SIGINT'));
    process.on('SIGTERM', () => graceful('SIGTERM'));
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
