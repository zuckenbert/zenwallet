import { Request, Response, Router } from 'express';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { conversationOrchestrator } from '../ai/orchestrator';
import { sanitizeInput } from '../../utils/validation';

export const whatsappWebhookRouter = Router();

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: { url: string; caption?: string; mimetype: string };
      documentMessage?: { url: string; fileName: string; mimetype: string };
      audioMessage?: { url: string; mimetype: string };
      buttonsResponseMessage?: { selectedButtonId: string };
      listResponseMessage?: { singleSelectReply: { selectedRowId: string } };
    };
    messageType?: string;
  };
}

// Deduplication: track recently processed message IDs (5 min TTL)
const processedMessages = new Map<string, number>();
const DEDUP_TTL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of processedMessages) {
    if (now - timestamp > DEDUP_TTL_MS) {
      processedMessages.delete(id);
    }
  }
}, 60_000);

function extractMessageContent(payload: EvolutionWebhookPayload): {
  text: string;
  mediaUrl?: string;
  mediaType?: string;
} | null {
  const msg = payload.data.message;
  if (!msg) return null;

  if (msg.conversation) {
    return { text: msg.conversation };
  }
  if (msg.extendedTextMessage?.text) {
    return { text: msg.extendedTextMessage.text };
  }
  if (msg.buttonsResponseMessage?.selectedButtonId) {
    return { text: msg.buttonsResponseMessage.selectedButtonId };
  }
  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return { text: msg.listResponseMessage.singleSelectReply.selectedRowId };
  }
  if (msg.imageMessage) {
    return {
      text: msg.imageMessage.caption || '[imagem]',
      mediaUrl: msg.imageMessage.url,
      mediaType: msg.imageMessage.mimetype,
    };
  }
  if (msg.documentMessage) {
    return {
      text: `[documento: ${msg.documentMessage.fileName}]`,
      mediaUrl: msg.documentMessage.url,
      mediaType: msg.documentMessage.mimetype,
    };
  }

  return null;
}

function extractPhone(remoteJid: string): string {
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

whatsappWebhookRouter.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  // Verify webhook origin via API key header
  const apiKey = req.headers['apikey'] || req.headers['x-api-key'];
  if (env.EVOLUTION_API_KEY && apiKey !== env.EVOLUTION_API_KEY) {
    logger.warn({ ip: req.ip }, 'Webhook unauthorized request');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = req.body as EvolutionWebhookPayload;

  // Respond immediately to avoid timeouts
  res.status(200).json({ status: 'received' });

  try {
    // Only process incoming messages (not our own)
    if (payload.event !== 'messages.upsert' || payload.data?.key?.fromMe) {
      return;
    }

    // Deduplication check
    const msgId = payload.data.key.id;
    if (processedMessages.has(msgId)) {
      logger.debug({ msgId }, 'Duplicate message ignored');
      return;
    }
    processedMessages.set(msgId, Date.now());

    const content = extractMessageContent(payload);
    if (!content) {
      logger.debug({ messageType: payload.data.messageType }, 'Unhandled message type');
      return;
    }

    const phone = extractPhone(payload.data.key.remoteJid);

    // Ignore group messages
    if (payload.data.key.remoteJid.endsWith('@g.us')) {
      logger.debug({ phone }, 'Group message ignored');
      return;
    }

    const name = payload.data.pushName || undefined;
    const sanitizedText = sanitizeInput(content.text, 2000);

    logger.info(
      { phone, text: sanitizedText.substring(0, 50), requestId: req.requestId },
      'Incoming WhatsApp message',
    );

    await conversationOrchestrator.handleIncomingMessage({
      phone,
      name,
      text: sanitizedText,
      mediaUrl: content.mediaUrl,
      mediaType: content.mediaType,
      whatsappMsgId: msgId,
    });
  } catch (error) {
    logger.error({ error, event: payload.event, requestId: req.requestId }, 'Error processing WhatsApp webhook');
  }
});
