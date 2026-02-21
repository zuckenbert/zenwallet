import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './api/routes';
import { whatsappWebhookRouter } from './services/whatsapp/webhook';
import { errorHandler } from './api/middleware/error-handler';
import { logger } from './config/logger';

const app = express();

// Security
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  if (req.path !== '/health') {
    logger.debug({ method: req.method, path: req.path }, 'Request');
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WhatsApp webhook (no auth - Evolution API handles this)
app.use(whatsappWebhookRouter);

// API routes
app.use('/api', apiRouter);

// Error handling
app.use(errorHandler);

export { app };
