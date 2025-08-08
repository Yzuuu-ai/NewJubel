const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
// Import routes - UPDATED TO USE ESCROW
const escrowRoutes = require('./routes/escrowRoutes');
const ruteAuth = require('./routes/ruteAuth');
const ruteProduk = require('./routes/ruteProduk');
const ruteTransaksi = require('./routes/ruteTransaksi');
const ruteUpload = require('./routes/ruteUpload');
const ruteAdmin = require('./routes/ruteAdmin');
const newAdminRoutes = require('./routes/newAdminRoutes'); // 🆕 NEW ADMIN ROUTES
const ruteNotifikasi = require('./routes/ruteNotifikasi'); // 🆕 NOTIFICATION ROUTES
const ruteAplikasiPenjual = require('./routes/ruteAplikasiPenjual'); // 🆕 SELLER APPLICATION ROUTES
// Import middleware
const requestLogger = require('./middleware/requestLogger');
const app = express();
const PORT = process.env.PORT || 5000;
// Security middleware
app.use(helmet());
// Rate limiting - lebih longgar untuk development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests untuk development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// Hanya apply rate limiting di production atau jika dibutuhkan
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_RATE_LIMIT === 'true') {
  app.use(limiter);
} else {
}
// CORS configuration - lebih fleksibel untuk development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3004',
  process.env.FRONTEND_URL
].filter(Boolean);
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development, allow any localhost
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    const msg = 'CORS policy tidak mengizinkan akses dari origin ini.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Serve static files (uploaded images)
app.use('/uploads', express.static('uploads'));
// Enhanced request logging middleware
app.use(requestLogger);
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Jubel Marketplace Server is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    contract: process.env.SMART_CONTRACT_ADDRESS,
    network: process.env.NETWORK || 'sepolia',
    features: {
      adminReleaseFunds: true,
      adminRefund: true,
      batchProcessing: true,
      enhancedAdmin: true
    }
  });
});
// API Routes - UPDATED TO USE ESCROW
app.use('/api/auth', ruteAuth);
app.use('/api/escrow', escrowRoutes); // NOW USING ESCROW ROUTES
app.use('/api/produk', ruteProduk);
app.use('/api/transaksi', ruteTransaksi);
app.use('/api/upload', ruteUpload);
app.use('/api/admin', ruteAdmin);
app.use('/api/admin-new', newAdminRoutes); // 🆕 NEW ADMIN ROUTES WITH ESCROW FEATURES
app.use('/api/notifikasi', ruteNotifikasi); // 🆕 NOTIFICATION ROUTES
app.use('/api/aplikasi-penjual', ruteAplikasiPenjual); // 🆕 SELLER APPLICATION ROUTES
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});
// Global error handler
app.use((error, req, res, next) => {
  console.error('Global Error Handler:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});
// Escrow Smart contract initialization
async function initializeEscrowContract() {
  try {
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Escrow contract:', error);
    return false;
  }
}
// Start server
async function startServer() {
  try {
    // Initialize Escrow contract
    const contractInitialized = await initializeEscrowContract();
    if (!contractInitialized) {
      console.warn('⚠️  Escrow contract initialization failed, but server will continue...');
    }
    // Start HTTP server
    app.listen(PORT, () => {
    });
  } catch (error) {
    console.error('❌ Failed to start Jubel server:', error);
    process.exit(1);
  }
}
// Handle graceful shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});
process.on('SIGINT', () => {
  process.exit(0);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception in Jubel:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection in Jubel at:', promise, 'reason:', reason);
  process.exit(1);
});
// Start the Jubel server
startServer();
