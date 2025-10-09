import mongoose from 'mongoose';
import { config } from './environment.js';

const connectDB = async () => {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };

        const conn = await mongoose.connect(config.MONGODB_URI, options);
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

export default connectDB;