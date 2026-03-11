import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET || 'health_connect_jwt_secret_key',
    jwtExpiresIn: '7d',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret',
    googleGenAIKey: process.env.GOOGLE_GENAI_API_KEY  || 'your_google_genai_api_key',
    googleGenAIModel: process.env.GOOGLE_GENAI_MODEL || 'gemini-1.5-flash',


};

export default config; 