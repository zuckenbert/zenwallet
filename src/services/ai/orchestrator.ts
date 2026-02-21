import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { loanAgent } from './agent';
import { whatsappClient } from '../whatsapp/client';
import { IncomingMessage } from '../../types';
import { DocumentType } from '@prisma/client';

class ConversationOrchestrator {
  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
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

      // 4. Build conversation history for Claude
      const history = conversation.messages.map((msg) => ({
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
      // Split long messages (WhatsApp has ~4096 char limit)
      const chunks = this.splitMessage(response.text, 4000);
      for (const chunk of chunks) {
        await whatsappClient.sendText({ to: phone, text: chunk });
        // Small delay between messages to maintain order
        if (chunks.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      logger.error({ error, phone }, 'Error in conversation orchestrator');

      // Send error message to user
      try {
        await whatsappClient.sendText({
          to: phone,
          text: 'Desculpe, estou com um problema técnico. Pode tentar novamente em alguns instantes? 🙏',
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

      // Try to split at a paragraph break
      let splitIndex = remaining.lastIndexOf('\n\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
        // Try single newline
        splitIndex = remaining.lastIndexOf('\n', maxLength);
      }
      if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
        // Try space
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
