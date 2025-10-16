import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Server
    PORT: process.env.PORT || 8017,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/myFEvent',
    
    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
    JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
    JWT_REFRESH_SALT_ROUNDS: process.env.JWT_REFRESH_SALT_ROUNDS || 10,
    
    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    
    // Frontend
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000'
};
