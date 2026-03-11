import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from '../src/config/db.js';
import authRoutes from '../src/routes/authRoutes.js';
import passwordRoutes from '../src/routes/passwordRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware in development
app.use(morgan('dev'));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);

// Base route for API health check
app.get('/', (req, res) => {
    res.status(200).send('HealthConnect API is running...');
});

app.get('/api', (req, res) => {
    res.status(200).send('HealthConnect API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// Handle 404 errors for any unmatched routes
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Route not found'
    });
});

// Export the Express API
export default app; 
