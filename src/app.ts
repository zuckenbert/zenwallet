import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './api/routes';
import { whatsappWebhookRouter } from './services/whatsapp/webhook';
import { errorHandler } from './api/middleware/error-handler';
import { requestId } from './api/middleware/request-id';
import { webhookRateLimit } from './api/middleware/rate-limiter';
import { logger } from './config/logger';
import { prisma } from './config/database';

const app = express();

// Trust proxy for correct IP behind load balancer
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'x-request-id'],
}));

// Request ID tracking
app.use(requestId);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging with request ID
app.use((req, _res, next) => {
  if (req.path !== '/health') {
    logger.info({ method: req.method, path: req.path, requestId: req.requestId }, 'Request');
  }
  next();
});

// Health check with deep check option
app.get('/health', async (req, res) => {
  const deep = req.query.deep === 'true';

  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  if (deep) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.database = 'ok';
    } catch {
      health.database = 'error';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// WhatsApp webhook with rate limiting
app.use(webhookRateLimit, whatsappWebhookRouter);

// API routes
app.use('/api', apiRouter);

// Error handling
app.use(errorHandler);

export { app };
