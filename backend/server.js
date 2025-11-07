import express from 'express';
import morgan from 'morgan';
import { config, connectDB, corsConfig } from './src/config/index.js';
import routes from './src/routes/index.js';

const app = express();

// Middleware
app.use(corsConfig);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'myFEvent API Server is running!',
    version: '1.0.0',
    environment: config.NODE_ENV
  });
});

// Test route
app.get('/test', (req, res) => {
  res.send('<h1>Hello World!</h1>');
});

// // Request logging middleware
// app.use((req, res, next) => {
//   console.log(`Request: ${req.method} ${req.url}`);
//   next();
// });

// Validation error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: config.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const startServer = async () => {
  try {
    await connectDB();
    
    // Khởi động scheduled task để tự động cập nhật trạng thái task
    const { startTaskAutoStatusScheduler } = await import('./src/services/taskAutoStatusService.js');
    startTaskAutoStatusScheduler();
    
    app.listen(config.PORT, () => {
      console.log(`Server is running at http://localhost:${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();