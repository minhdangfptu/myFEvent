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
      await mongoose.connect(config.MONGODB_URI, options);
      lastError = null;
      break; // Kết nối thành công, thoát loop
    } catch (error) {
      lastError = error;
      retries--;

      if (retries > 0) {
        // Đợi trước khi retry (exponential backoff)
        const waitTime = (4 - retries) * 3000; // 3s, 6s, 9s
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Nếu sau khi retry hết vẫn lỗi
  if (lastError) {
    throw lastError;
  }

  // Đăng ký listener CHỈ 1 LẦN (chỉ chạy khi connect thành công)
  if (!listenersRegistered) {
    listenersRegistered = true;

    const graceful = async () => {
      try {
        await mongoose.connection.close();
      } finally {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => graceful('SIGINT'));
    process.on('SIGTERM', () => graceful('SIGTERM'));
  }
};

export default connectDB;
