import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cors from 'cors';
import { prisma } from './config/db.js';
import { initializeWorker, shutdownWorker } from './jobs/cronScheduler.js';

import { authMiddleware } from './middleware/authMiddleware.js';
import validateMiddleware from './middleware/validateMiddleware.js';
import encryptionMiddleware from './middleware/encryptionMiddleware.js';
import requestLoggerMiddleware from './middleware/requestLoggerMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';

import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import doctorRoutes from './routes/doctor.route.js';
import patientRoutes from './routes/patient.route.js';
import encounterRoutes from './routes/encounter.route.js';
import prescriptionRoutes from './routes/prescription.route.js';
import medicineRoutes from './routes/medicine.route.js';
import labRoutes from './routes/lab.route.js';
import feedbackRoutes from './routes/feedback.route.js';
import notificationRoutes from './routes/notification.route.js';
import analyticsRoutes from './routes/analytics.route.js';
import inventoryRoutes from './routes/inventory.route.js';
import paymentRoutes from './routes/payment.route.js';
import vitalRoutes from './routes/vital.route.js';
import summaryRoutes from './routes/summary.route.js';
import videoInstructionRoutes from './routes/video_instruction.route.js';
import hospitalAdmin from './routes/hospitalAdmin.routes.js';
import nurse from './routes/nurse.routes.js';
import inventoryManager from './routes/inventoryManager.routes.js';
import labManager from './routes/labManager.routes.js';
import receptionist from './routes/receptionist.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';

// Trigger reload to pick up updated dotenv config
dotenv.config();

const app = express();
const currentEnv = process.env.NODE_ENV || 'development';
const allowedCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedDevOrigin = (origin) => {
  if (!origin || currentEnv !== 'development') {
    return false;
  }

  try {
    const { hostname } = new URL(origin);
    return ['localhost', '127.0.0.1', '10.0.2.2'].includes(hostname);
  } catch {
    return false;
  }
};

// Middleware
app.use(requestLoggerMiddleware);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedCorsOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Enforce strict rate limiting in production only.
if (currentEnv === 'production') {
  app.use('/api/', limiter);
}

app.use(validateMiddleware);
app.use(encryptionMiddleware);

// Health check endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'MediLink server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'OK',
      message: 'Database connection successful',
      database: 'PostgreSQL',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api', (_req, res) => {
  res.status(200).json({
    message: 'Welcome to MediLink Healthcare Management API',
    version: '1.0.0',
  });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Protected routes (require authentication)
app.use('/api', authMiddleware);

app.use('/api/medicines', medicineRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/encounters', encounterRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/vitals', vitalRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/video-instructions', videoInstructionRoutes);
app.use('/api/admin', hospitalAdmin);
app.use('/api/nurses', nurse);
app.use('/api/inventory-managers', inventoryManager);
app.use('/api/lab-managers', labManager);
app.use('/api/receptionists', receptionist);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    status: 'NOT_FOUND',
    message: 'Route not found',
    path: _req.path,
  });
});

// Error handler (must be last)
app.use(errorMiddleware);

// Server startup
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║            MediLink Server Started Successfully            ║
╠════════════════════════════════════════════════════════════╣
║ Server URL: http://localhost:${PORT}${' '.repeat(PORT.toString().length === 4 ? 16 : 15)}║
║ Environment: ${NODE_ENV.padEnd(49)}║
║ Database: PostgreSQL                                       ║
║ Health Check: /health                                      ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Initialize reminder worker
  initializeWorker();
  console.log('✓ Reminder worker initialized');
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Shutdown worker first
  shutdownWorker();
  console.log('Reminder worker stopped');

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
