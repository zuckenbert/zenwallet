import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { DiditProvider } from './didit-provider';
import { CAFProvider, KYCVerificationResult } from './caf-provider';

/**
 * Unified KYC service - picks the right provider based on env flags
 *
 * Priority:
 * 1. Didit (free 500/month - best for MVP)
 * 2. CAF (enterprise - best for scale)
 * 3. Mock (no real verification, auto-approve)
 */
class KYCService {
  private didit: DiditProvider | null;
  private caf: CAFProvider | null;
  private providerName: string;

  constructor() {
    this.didit = env.DIDIT_ENABLED ? new DiditProvider() : null;
    this.caf = env.CAF_ENABLED ? new CAFProvider() : null;
    this.providerName = this.didit ? 'didit' : this.caf ? 'caf' : 'mock';
    logger.info({ provider: this.providerName }, 'KYC service initialized');
  }

  /**
   * Start a KYC verification for a lead
   * Returns a verification URL the user can open via WhatsApp
   */
  async startVerification(phone: string): Promise<{
    success: boolean;
    verificationUrl?: string;
    verificationId?: string;
    message: string;
  }> {
    const lead = await prisma.lead.findUnique({ where: { phone } });
    if (!lead) {
      return { success: false, message: 'Lead não encontrado.' };
    }

    if (lead.kycVerified) {
      return { success: true, message: 'Identidade já verificada.' };
    }

    if (!lead.cpf) {
      return { success: false, message: 'CPF não cadastrado. Colete o CPF primeiro.' };
    }

    // Didit: session-based (user opens URL)
    if (this.didit) {
      try {
        const session = await this.didit.createSession({
          cpf: lead.cpf,
          leadId: lead.id,
        });

        await prisma.lead.update({
          where: { phone },
          data: { kycVerificationId: session.sessionId },
        });

        return {
          success: true,
          verificationUrl: session.verificationUrl,
          verificationId: session.sessionId,
          message: `Para validar sua identidade, acesse o link:\n${session.verificationUrl}\n\nVocê precisará tirar uma foto do documento e uma selfie.`,
        };
      } catch (error) {
        logger.error({ error, phone }, 'Didit KYC session creation failed');
        return { success: false, message: 'Erro ao iniciar verificação. Tente novamente.' };
      }
    }

    // CAF: direct API call with document URLs
    if (this.caf) {
      // CAF needs document images - check if they're uploaded
      const docs = await prisma.document.findMany({
        where: { leadId: lead.id, type: { in: ['RG_FRONT', 'CNH', 'SELFIE'] } },
      });

      const docFront = docs.find((d) => d.type === 'RG_FRONT' || d.type === 'CNH');
      const selfie = docs.find((d) => d.type === 'SELFIE');

      if (!docFront || !selfie) {
        return {
          success: false,
          message: 'Documentos insuficientes para verificação. Envie frente do RG/CNH e uma selfie.',
        };
      }

      try {
        const result = await this.caf.verifyIdentity({
          documentFrontUrl: docFront.filePath,
          selfieUrl: selfie.filePath,
          cpf: lead.cpf,
          documentType: docFront.type === 'CNH' ? 'cnh' : 'rg',
        });

        await prisma.lead.update({
          where: { phone },
          data: {
            kycVerified: result.verified,
            kycVerifiedAt: result.verified ? new Date() : null,
            kycVerificationId: result.verificationId,
          },
        });

        return {
          success: true,
          verificationId: result.verificationId,
          message: result.verified
            ? 'Identidade verificada com sucesso!'
            : `Verificação não aprovada: facematch ${Math.round(result.facematchScore * 100)}%. Tente novamente com fotos mais claras.`,
        };
      } catch (error) {
        logger.error({ error, phone }, 'CAF KYC verification failed');
        return { success: false, message: 'Erro na verificação. Tente novamente.' };
      }
    }

    // Mock: auto-approve
    await prisma.lead.update({
      where: { phone },
      data: {
        kycVerified: true,
        kycVerifiedAt: new Date(),
        kycVerificationId: `mock-${Date.now()}`,
      },
    });

    return {
      success: true,
      message: 'Identidade verificada com sucesso! (modo de desenvolvimento)',
    };
  }

  /**
   * Handle Didit webhook callback
   */
  async handleDiditWebhook(sessionId: string, status: string, vendorData: string): Promise<void> {
    if (!this.didit) return;

    if (status !== 'Approved' && status !== 'Declined') return;

    // vendorData is the leadId
    const lead = await prisma.lead.findFirst({
      where: { kycVerificationId: sessionId },
    });

    if (!lead) {
      logger.warn({ sessionId }, 'Didit webhook: lead not found');
      return;
    }

    if (status === 'Approved') {
      // Get full decision with OCR data
      const decision = await this.didit.getSessionDecision(sessionId);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          kycVerified: true,
          kycVerifiedAt: new Date(),
        },
      });

      // If OCR extracted data, update lead (only if fields are empty)
      if (decision.ocrData.name && !lead.name) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { name: decision.ocrData.name },
        });
      }

      logger.info({ leadId: lead.id, sessionId }, 'KYC verified via Didit webhook');
    } else {
      logger.info({ leadId: lead.id, sessionId, status }, 'KYC declined via Didit webhook');
    }
  }

  getProviderName(): string {
    return this.providerName;
  }
}

export const kycService = new KYCService();
