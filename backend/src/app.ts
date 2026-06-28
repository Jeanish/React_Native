import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import { env, isDevelopment } from './config/environment';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { generalLimiter } from './middleware/rateLimiter.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import salonRoutes from './routes/salon.routes';
import adminRoutes from './routes/admin.routes';
import categoryRoutes from './routes/category.routes';
import cityRoutes from './routes/city.routes';
import serviceRoutes from './routes/service.routes';
import appointmentRoutes from './routes/appointment.routes';

// Create Express app
const app: Application = express();

// Trust the first proxy hop so req.ip / X-Forwarded-For work correctly behind
// ngrok, Cloudflare, or any standard reverse proxy. Required for express-rate-limit.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(mongoSanitize());

// CORS configuration
const corsOptions = {
  origin: env.CORS_ORIGIN.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Rate limiting middleware
app.use(generalLimiter);

// Logging middleware
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  }));
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbHealthy = dbState === 1;

  res.status(dbHealthy ? 200 : 503).json({
    success: dbHealthy,
    message: dbHealthy ? 'Server is running' : 'Database unavailable',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: {
        connected: dbHealthy,
        state: dbState,
      },
    },
  });
});

// API routes
app.get(`/api/${env.API_VERSION}`, (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Salon App API',
    version: env.API_VERSION,
    documentation: '/api/docs',
  });
});

// API routes
app.use(`/api/${env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${env.API_VERSION}/users`, userRoutes);
app.use(`/api/${env.API_VERSION}/salons`, salonRoutes);
app.use(`/api/${env.API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${env.API_VERSION}/cities`, cityRoutes);
app.use(`/api/${env.API_VERSION}/services`, serviceRoutes);
app.use(`/api/${env.API_VERSION}/appointments`, appointmentRoutes);
app.use(`/api/${env.API_VERSION}/admin`, adminRoutes);
// Public banner endpoint (used by mobile app)
app.get(`/api/${env.API_VERSION}/banners`, async (req, res, next) => {
  try {
    const { getLiveBanners } = await import('./controllers/banner.controller');
    return getLiveBanners(req, res, next);
  } catch (e) { next(e); }
});
app.post(`/api/${env.API_VERSION}/banners/:id/click`, async (req, res, next) => {
  try {
    const { trackBannerClick } = await import('./controllers/banner.controller');
    return trackBannerClick(req, res, next);
  } catch (e) { next(e); }
});
// app.use(`/api/${env.API_VERSION}/queue`, queueRoutes);
// app.use(`/api/${env.API_VERSION}/notifications`, notificationRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
