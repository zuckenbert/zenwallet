import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey || apiKey !== env.API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
