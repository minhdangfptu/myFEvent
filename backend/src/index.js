import express from 'express';
import { config } from './config/environment.js';
import connectDB from './config/mongodb.js';
import corsConfig from './config/cors.js';
import routes from './routes/index.js';

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(corsConfig);
// Increase body limits to allow base64 images in JSON payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: config.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Frontend URL: ${config.FRONTEND_URL}`);
});