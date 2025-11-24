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
    console.error('\n❌ MongoDB connection failed!');
    console.error('\n📋 Chi tiết lỗi:', error.message);
    
    // Kiểm tra các lỗi phổ biến và đưa ra hướng dẫn
    if (error.message.includes('whitelist') || error.message.includes('IP')) {
      console.error('\n🔧 Giải pháp:');
      console.error('1. Kiểm tra IP của bạn có được whitelist trong MongoDB Atlas không');
      console.error('2. Truy cập: https://cloud.mongodb.com/ → Network Access');
      console.error('3. Thêm IP hiện tại của bạn hoặc sử dụng 0.0.0.0/0 (cho phép tất cả IP)');
      console.error('4. Đợi vài phút để thay đổi có hiệu lực');
    } else if (error.message.includes('authentication')) {
      console.error('\n🔧 Giải pháp:');
      console.error('1. Kiểm tra lại MONGODB_URI trong file .env');
      console.error('2. Đảm bảo username và password đúng');
      console.error('3. Kiểm tra database user có quyền truy cập');
    } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.error('\n🔧 Giải pháp:');
      console.error('1. Kiểm tra kết nối internet');
      console.error('2. Kiểm tra MONGODB_URI có đúng không');
      console.error('3. Thử tăng serverSelectionTimeoutMS trong mongodb.js');
    } else {
      console.error('\n🔧 Giải pháp:');
      console.error('1. Kiểm tra MONGODB_URI trong file .env');
      console.error('2. Kiểm tra MongoDB Atlas cluster có đang hoạt động không');
      console.error('3. Xem log chi tiết ở trên để biết thêm thông tin');
    }
    
    console.error('\n💡 Tip: Nếu đang dùng MongoDB local, đảm bảo MongoDB service đang chạy\n');
    process.exit(1);
  }
};

export default connectDB;
