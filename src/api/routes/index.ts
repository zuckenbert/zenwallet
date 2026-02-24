import { Router } from 'express';
import { leadsRouter } from './leads';
import { applicationsRouter } from './applications';
import { dashboardRouter } from './dashboard';
import { contractsRouter } from './contracts';
import { simulationRouter } from './simulation';
import { webhooksRouter } from './webhooks';
import { apiKeyAuth } from '../middleware/auth';
import { publicApiRateLimit, adminApiRateLimit } from '../middleware/rate-limiter';

export const apiRouter = Router();

// Webhook routes (no auth - verified by payload signatures)
apiRouter.use('/webhooks', webhooksRouter);

// Public routes (no auth, rate limited)
apiRouter.use('/simulation', publicApiRateLimit, simulationRouter);
apiRouter.use('/contracts', publicApiRateLimit, contractsRouter);

// Protected routes (API key + admin rate limit)
apiRouter.use('/leads', apiKeyAuth, adminApiRateLimit, leadsRouter);
apiRouter.use('/applications', apiKeyAuth, adminApiRateLimit, applicationsRouter);
apiRouter.use('/dashboard', apiKeyAuth, adminApiRateLimit, dashboardRouter);
