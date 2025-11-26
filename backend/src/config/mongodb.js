import mongoose from 'mongoose';
import { config } from './environment.js';

const connectDB = async () => {
  try {
    const options = {
      // Tăng timeout cho production environment
      serverSelectionTimeoutMS: 30000, // Tăng từ 5s lên 30s
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      
      // Giảm pool size cho Atlas free tier
      maxPoolSize: 5, // Giảm từ 10 xuống 5
      minPoolSize: 1, // Giảm từ 2 xuống 1
      maxIdleTimeMS: 30000, // Thêm max idle time
      
      // Connection retry settings
      retryWrites: true,
      retryReads: true,
      
      family: 4,
    };

    const conn = await mongoose.connect(config.MONGODB_URI, options);
    console.log('MongoDB Connected!');
    console.log(`Database: ${conn.connection.name}`);

    // Enhanced error handling
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      // Không exit process, để app tiếp tục chạy
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      // Auto reconnect sau 5s
      setTimeout(() => {
        console.log('Attempting to reconnect to MongoDB...');
        connectDB();
      }, 5000);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
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
    console.error('\n❌ MongoDB connection failed!');
    console.error('\n📋 Chi tiết lỗi:', error.message);
    
    // Retry connection sau 5s thay vì exit
    console.log('Retrying connection in 5 seconds...');
    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};

// Wrapper function với retry logic
const connectWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await connectDB();
      return; // Thành công, thoát loop
    } catch (error) {
      console.log(`Connection attempt ${i + 1} failed. Retrying...`);
      if (i === maxRetries - 1) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      // Đợi 5s trước khi retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

export default connectWithRetry;