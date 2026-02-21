import { Router } from 'express';
import { leadsRouter } from './leads';
import { applicationsRouter } from './applications';
import { dashboardRouter } from './dashboard';
import { contractsRouter } from './contracts';
import { simulationRouter } from './simulation';
import { apiKeyAuth } from '../middleware/auth';

export const apiRouter = Router();

// Public routes (no auth)
apiRouter.use('/simulation', simulationRouter);
apiRouter.use('/contracts', contractsRouter);

// Protected routes (API key required)
apiRouter.use('/leads', apiKeyAuth, leadsRouter);
apiRouter.use('/applications', apiKeyAuth, applicationsRouter);
apiRouter.use('/dashboard', apiKeyAuth, dashboardRouter);
