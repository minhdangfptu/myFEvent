import express from 'express';
import corsConfig from './config/cors.js';
import routes from './routes/index.js';

const app = express();

// Middleware
app.use(corsConfig);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
	return res.status(200).json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
	return res.status(404).json({ message: 'Route not found' });
});

export default app;


