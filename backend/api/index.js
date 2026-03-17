import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from '../src/config/db.js';
import authRoutes from '../src/routes/authRoutes.js';
import passwordRoutes from '../src/routes/passwordRoutes.js';
import paymentRouter from '../src/routes/paymentRouter.js';
import healthProfileRoutes from '../src/routes/healthProfileRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow any *.vercel.app deployment + localhost dev origins
const allowedOrigins = [
    'https://medibridgeofficial.vercel.app',
    'https://health-connect-app-main.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow Postman / server-to-server (no origin header)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Allow any Vercel preview deployment
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Explicitly handle preflight for every route
app.options('*', cors());

app.use(express.json());

// Logging middleware in development
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/payment', paymentRouter);
app.use('/api/health-profile', healthProfileRoutes);

// Base route for API health check
app.get('/', (req, res) => {
    res.status(200).json({ message: 'MediBridge API is running...' });
});

app.get('/api', (req, res) => {
    res.status(200).json({ message: 'HealthConnect API is running...' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// Handle 404 errors for any unmatched routes
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Export the Express API (Vercel serverless handler)
export default app;
