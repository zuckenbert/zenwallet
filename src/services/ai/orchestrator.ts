import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { loanAgent } from './agent';
import { whatsappClient } from '../whatsapp/client';
import { IncomingMessage } from '../../types';
import { DocumentType } from '@prisma/client';

// Per-phone concurrency lock to prevent race conditions with simultaneous messages
const activeLocks = new Map<string, { promise: Promise<void>; createdAt: number }>();
const LOCK_TTL_MS = 2 * 60 * 1000; // 2 minute timeout to prevent deadlocks

class ConversationOrchestrator {
  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    const { phone } = message;

    // Expire stale locks (prevent deadlock if processing crashed)
    const existing = activeLocks.get(phone);
    const now = Date.now();
    const baseLock = (existing && now - existing.createdAt < LOCK_TTL_MS)
      ? existing.promise
      : Promise.resolve();

    // Queue this message after the current lock
    const currentPromise = baseLock.then(() => this.processMessage(message)).catch(() => {});
    activeLocks.set(phone, { promise: currentPromise, createdAt: now });

    try {
      await currentPromise;
    } finally {
      if (activeLocks.get(phone)?.promise === currentPromise) {
        activeLocks.delete(phone);
      }
    }
  }

  private async processMessage(message: IncomingMessage): Promise<void> {
    const { phone, name, text, mediaUrl, mediaType, whatsappMsgId } = message;

    try {
      // 1. Ensure lead exists
      const lead = await prisma.lead.upsert({
        where: { phone },
        update: { ...(name ? { name } : {}) },
        create: { phone, name, stage: 'NEW' },
        include: {
          applications: { orderBy: { createdAt: 'desc' }, take: 1 },
          documents: true,
        },
      });

      // 2. Get or create active conversation
      let conversation = await prisma.conversation.findFirst({
        where: { leadId: lead.id, active: true },
        include: {
          messages: { orderBy: { createdAt: 'asc' }, take: 50 },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { leadId: lead.id },
          include: { messages: true },
        });
      }

      // 3. Save incoming message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: text,
          mediaUrl,
          mediaType,
          whatsappMsgId,
        },
      });

      // 4. Build conversation history for Claude (filter out SYSTEM messages)
      const history = conversation.messages
        .filter((msg) => msg.role !== 'SYSTEM')
        .map((msg) => ({
          role: msg.role === 'USER' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        }));

      // 5. Build context
      const requiredDocs: DocumentType[] = ['RG_FRONT', 'RG_BACK', 'PROOF_OF_INCOME', 'PROOF_OF_ADDRESS', 'SELFIE'];
      const sentDocs = lead.documents.map((d) => d.type);
      const pendingDocs = requiredDocs.filter((d) => !sentDocs.includes(d));

      const docLabels: Record<string, string> = {
        RG_FRONT: 'Frente do RG',
        RG_BACK: 'Verso do RG',
        PROOF_OF_INCOME: 'Comprovante de renda',
        PROOF_OF_ADDRESS: 'Comprovante de endereço',
        SELFIE: 'Selfie com documento',
      };

      const context = {
        leadName: lead.name || undefined,
        leadStage: lead.stage,
        consentGiven: !!lead.consentGivenAt,
        hasApplication: lead.applications.length > 0,
        applicationStatus: lead.applications[0]?.status,
        pendingDocuments: pendingDocs.map((d) => docLabels[d] || d),
      };

      // 6. Get AI response
      const response = await loanAgent.chat(text, history, context);

      logger.info(
        { phone, toolsUsed: response.toolsUsed, responseLength: response.text.length },
        'AI response generated',
      );

      // 7. Save AI response
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: response.text,
        },
      });

      // 8. Send response via WhatsApp
      const chunks = this.splitMessage(response.text, 4000);
      for (const chunk of chunks) {
        await whatsappClient.sendText({ to: phone, text: chunk });
        if (chunks.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      logger.error({ error, phone }, 'Error in conversation orchestrator');

      try {
        await whatsappClient.sendText({
          to: phone,
          text: 'Desculpe, estou com um problema técnico. Pode tentar novamente em alguns instantes?',
        });
      } catch {
        logger.error({ phone }, 'Failed to send error message');
      }
    }
  }

  private splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      let splitIndex = remaining.lastIndexOf('\n\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
        splitIndex = remaining.lastIndexOf('\n', maxLength);
      }
      if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
        splitIndex = remaining.lastIndexOf(' ', maxLength);
      }
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }

      chunks.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex).trimStart();
    }

    return chunks;
  }
}

export const conversationOrchestrator = new ConversationOrchestrator();
