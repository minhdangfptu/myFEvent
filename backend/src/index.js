import { config } from './config/environment.js';
import connectDB from './config/mongodb.js';
import app from './app.js';

// Connect to MongoDB and start server
connectDB();

const PORT = config.PORT;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
	console.log(`Environment: ${config.NODE_ENV}`);
	console.log(`Frontend URL: ${config.FRONTEND_URL}`);
});