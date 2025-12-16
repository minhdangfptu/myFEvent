import mongoose from 'mongoose';
import { config } from './environment.js';

let listenersRegistered = false;

const connectDB = async () => {
  const options = {
    serverSelectionTimeoutMS: 30000, // Tăng lên 30s để xử lý network chậm
    connectTimeoutMS: 30000, // Tăng lên 30s
    socketTimeoutMS: 75000, // Tăng lên 75s cho các query phức tạp
    maxPoolSize: 10, // Tăng pool size cho production
    minPoolSize: 2,
    maxIdleTimeMS: 60000, // Tăng idle time lên 60s
    retryWrites: true,
    retryReads: true,
    family: 4,
    // Thêm các options quan trọng khác
    heartbeatFrequencyMS: 10000, // Kiểm tra kết nối mỗi 10s
    serverMonitoringMode: 'auto',
  };

  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Retry logic
  let retries = 3;
  let lastError;

  while (retries > 0) {
    try {
      const conn = await mongoose.connect(config.MONGODB_URI, options);
      console.log('✅ MongoDB Connected!');
      console.log(`📦 Database: ${conn.connection.name}`);
      lastError = null;
      break; // Kết nối thành công, thoát loop
    } catch (error) {
      lastError = error;
      retries--;
      console.error(`❌ MongoDB connection attempt failed. Retries left: ${retries}`);
      console.error('Error:', error.message);

      if (retries > 0) {
        // Đợi trước khi retry (exponential backoff)
        const waitTime = (4 - retries) * 3000; // 3s, 6s, 9s
        console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Nếu sau khi retry hết vẫn lỗi
  if (lastError) {
    console.error('\n❌ MongoDB connection failed after all retries!');
    console.error('📋 Chi tiết lỗi:', lastError.message);
    throw lastError;
  }

  // Đăng ký listener CHỈ 1 LẦN (chỉ chạy khi connect thành công)
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
};

export default connectDB;
