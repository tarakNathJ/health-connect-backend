import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import config from './config/config.js';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import passwordRoutes from './routes/passwordRoutes.js';
import paymentRouter from './routes/paymentRouter.js';
import healthProfileRoutes from './routes/healthProfileRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = config.port;

// Middleware
// Allowed origins — add new deployment URLs here
const allowedOrigins = [
    'https://medibridgeofficial.vercel.app',
    'https://health-connect-app-main.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Also allow any vercel.app subdomain for preview deployments
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Explicitly handle preflight for all routes (required for Vercel serverless)
app.options('*', cors());
app.use(express.json());

// Logging middleware
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/payment', paymentRouter);
app.use('/api/health-profile', healthProfileRoutes);

// Base route
app.get('/', (req, res) => {
    res.send('MediBridge API is running...');
});

// // Error handling middleware
// app.use((err, req, res, next) => {
//     const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
//     res.status(statusCode);
//     res.json({
//         message: err.message,
//         stack: config.nodeEnv === 'production' ? null : err.stack,
//     });
// });

// Start server
app.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
}); 