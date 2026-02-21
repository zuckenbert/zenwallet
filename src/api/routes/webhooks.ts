import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { contractService } from '../../services/contracts/service';
import { kycService } from '../../services/kyc/service';
import { ClicksignClient } from '../../services/contracts/clicksign';
import { QITechProvider } from '../../services/funding/qitech-provider';
import { DiditProvider } from '../../services/kyc/didit-provider';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

export const webhooksRouter = Router();

// Simple in-memory idempotency set with TTL (prevents duplicate webhook processing)
const processedWebhooks = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicate(key: string): boolean {
  const now = Date.now();
  // Cleanup old entries periodically
  if (processedWebhooks.size > 1000) {
    for (const [k, ts] of processedWebhooks) {
      if (now - ts > IDEMPOTENCY_TTL_MS) processedWebhooks.delete(k);
    }
  }
  if (processedWebhooks.has(key)) return true;
  processedWebhooks.set(key, now);
  return false;
}

/**
 * Verify HMAC-SHA256 webhook signature
 */
function verifyHmac(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true; // Skip verification if no secret configured (dev mode)
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf-8')
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

/**
 * Clicksign webhook - receives signature events
 * POST /api/webhooks/clicksign
 *
 * Configure in Clicksign dashboard:
 * URL: https://your-domain.com/api/webhooks/clicksign
 */
webhooksRouter.post('/clicksign', async (req: Request, res: Response) => {
  if (!env.CLICKSIGN_ENABLED) {
    res.status(400).json({ error: 'Invalid webhook payload' });
    return;
  }

  // Verify HMAC signature (Clicksign sends in Content-Hmac header)
  if (env.CLICKSIGN_WEBHOOK_SECRET) {
    const hmacHeader = req.headers['content-hmac'] as string || '';
    const rawBody = JSON.stringify(req.body);
    if (!verifyHmac(rawBody, hmacHeader.replace('sha256=', ''), env.CLICKSIGN_WEBHOOK_SECRET)) {
      logger.warn('Clicksign webhook: invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  const webhook = ClicksignClient.parseWebhook(req.body);
  if (!webhook) {
    res.status(400).json({ error: 'Invalid webhook payload' });
    return;
  }

  // Idempotency check
  const idempotencyKey = `clicksign:${webhook.document.key}:${webhook.event.name}`;
  if (isDuplicate(idempotencyKey)) {
    res.json({ received: true, duplicate: true });
    return;
  }

  logger.info(
    { event: webhook.event.name, documentKey: webhook.document.key },
    'Clicksign webhook received',
  );

  try {
    await contractService.handleClicksignWebhook(
      webhook.document.key,
      webhook.event.name,
    );
    res.json({ received: true });
  } catch (error) {
    logger.error({ error, webhook }, 'Clicksign webhook processing failed');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * QI Tech webhook - receives disbursement status updates
 * POST /api/webhooks/qitech
 *
 * Configure with QI Tech:
 * URL: https://your-domain.com/api/webhooks/qitech
 */
webhooksRouter.post('/qitech', async (req: Request, res: Response) => {
  if (!env.QITECH_ENABLED) {
    res.status(400).json({ error: 'Invalid webhook payload' });
    return;
  }

  // Verify HMAC signature
  if (env.QITECH_WEBHOOK_SECRET) {
    const sigHeader = req.headers['x-qitech-signature'] as string || '';
    const rawBody = JSON.stringify(req.body);
    if (!verifyHmac(rawBody, sigHeader, env.QITECH_WEBHOOK_SECRET)) {
      logger.warn('QI Tech webhook: invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  const webhook = QITechProvider.parseWebhook(req.body);
  if (!webhook) {
    res.status(400).json({ error: 'Invalid webhook payload' });
    return;
  }

  // Idempotency check
  const idempotencyKey = `qitech:${webhook.key}:${webhook.status}`;
  if (isDuplicate(idempotencyKey)) {
    res.json({ received: true, duplicate: true });
    return;
  }

  logger.info(
    { type: webhook.webhook_type, key: webhook.key, status: webhook.status },
    'QI Tech webhook received',
  );

  try {
    await contractService.handleQITechWebhook(webhook.key, webhook.status);
    res.json({ received: true });
  } catch (error) {
    logger.error({ error, webhook }, 'QI Tech webhook processing failed');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Didit webhook - receives KYC verification results
 * POST /api/webhooks/didit
 *
 * Configure in Didit dashboard (business.didit.me):
 * URL: https://your-domain.com/api/webhooks/didit
 */
webhooksRouter.post('/didit', async (req: Request, res: Response) => {
  if (!env.DIDIT_ENABLED) {
    res.status(400).json({ error: 'Invalid webhook payload' });
    return;
  }

  // Verify HMAC signature
  if (env.DIDIT_WEBHOOK_SECRET) {
    const sigHeader = req.headers['x-didit-signature'] as string || '';
    const rawBody = JSON.stringify(req.body);
    if (!verifyHmac(rawBody, sigHeader, env.DIDIT_WEBHOOK_SECRET)) {
      logger.warn('Didit webhook: invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  const webhook = DiditProvider.parseWebhook(req.body);
  if (!webhook) {
    res.status(400).json({ error: 'Invalid webhook payload' });
    return;
  }

  // Idempotency check
  const idempotencyKey = `didit:${webhook.sessionId}:${webhook.status}`;
  if (isDuplicate(idempotencyKey)) {
    res.json({ received: true, duplicate: true });
    return;
  }

  logger.info(
    { sessionId: webhook.sessionId, status: webhook.status },
    'Didit webhook received',
  );

  try {
    await kycService.handleDiditWebhook(
      webhook.sessionId,
      webhook.status,
      webhook.vendorData,
    );
    res.json({ received: true });
  } catch (error) {
    logger.error({ error, webhook }, 'Didit webhook processing failed');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
