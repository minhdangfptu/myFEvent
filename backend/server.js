const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const { connect } = require('mongoose');
const router = require('./src/routes');
const morgan = require('morgan');
var cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./src/config/db.js');

const app = express();
const passport = require('passport');

const corsOptions = {
  origin: [
    'http://localhost:3000', // React development server
    'http://localhost:5173', // Vite development server  
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL2
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));



// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(morgan('dev'));

//Connection to MongoDB
connectDB();

// For parsing application/json - Increase limit for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// For parsing application/x-www-form-urlencoded - Increase limit for base64 images
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/reptitist', router);

// Test route should be inside the router or moved before mounting
app.get("/test", (req, res) => {
  res.send("<h1>Hello World!</h1>");
});
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`server is running at http://localhost:${process.env.PORT}`);
});