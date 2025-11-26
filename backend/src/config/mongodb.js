import mongoose from 'mongoose';
import { config } from './environment.js';

let listenersRegistered = false;

const connectDB = async () => {
  const options = {
    serverSelectionTimeoutMS: 10000, // 10s
    connectTimeoutMS: 10000, // 10s
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
    family: 4,
  };

  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const conn = await mongoose.connect(config.MONGODB_URI, options);
    console.log('✅ MongoDB Connected!');
    console.log(`📦 Database: ${conn.connection.name}`);

    // Đăng ký listener CHỈ 1 LẦN
    if (!listenersRegistered) {
      listenersRegistered = true;

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
        // KHÔNG tự connectDB() nữa, tránh vòng lặp vô hạn & spam
      });

      mongoose.connection.on('connected', () => {
        console.log('MongoDB connected/reconnected');
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
    }
  } catch (error) {
    console.error('\n❌ MongoDB connection failed!');
    console.error('📋 Chi tiết lỗi:', error.message);
    // Tùy ý:
    // - quăng lỗi ra cho caller xử lý retry
    // - hoặc process.exit(1) nếu muốn container/app restart
    throw error;
  }
};

export default connectDB;
