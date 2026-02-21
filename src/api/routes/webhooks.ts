import { Router, Request, Response } from 'express';
import { contractService } from '../../services/contracts/service';
import { ClicksignClient } from '../../services/contracts/clicksign';
import { QITechProvider } from '../../services/funding/qitech-provider';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

export const webhooksRouter = Router();

/**
 * Clicksign webhook - receives signature events
 * POST /api/webhooks/clicksign
 *
 * Configure in Clicksign dashboard:
 * URL: https://your-domain.com/api/webhooks/clicksign
 */
webhooksRouter.post('/clicksign', async (req: Request, res: Response) => {
  if (!env.CLICKSIGN_ENABLED) {
    res.status(404).json({ error: 'Clicksign integration not enabled' });
    return;
  }

  const webhook = ClicksignClient.parseWebhook(req.body);
  if (!webhook) {
    res.status(400).json({ error: 'Invalid webhook payload' });
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
    res.status(404).json({ error: 'QI Tech integration not enabled' });
    return;
  }

  const webhook = QITechProvider.parseWebhook(req.body);
  if (!webhook) {
    res.status(400).json({ error: 'Invalid webhook payload' });
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
