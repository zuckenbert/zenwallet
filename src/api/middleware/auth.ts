import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // Header-only auth - never accept API keys in query strings (they leak in logs/referrers)
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== env.API_KEY) {
    res.status(401).json({ error: 'Unauthorized', requestId: req.requestId });
    return;
  }

  next();
}
