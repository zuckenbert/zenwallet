import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { DocumentType, DocumentStatus } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

class DocumentService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  async registerDocument(
    phone: string,
    type: DocumentType,
    mediaUrl?: string,
    mimeType?: string,
  ): Promise<{ success: boolean; documentId?: string; message: string }> {
    const lead = await prisma.lead.findUnique({ where: { phone } });
    if (!lead) {
      return { success: false, message: 'Lead não encontrado.' };
    }

    // Check if document type already exists - update if so
    const existing = await prisma.document.findFirst({
      where: { leadId: lead.id, type },
    });

    const fileName = `${lead.id}_${type}_${uuid().slice(0, 8)}`;
    const filePath = mediaUrl || `${this.uploadDir}/${fileName}`;

    if (existing) {
      await prisma.document.update({
        where: { id: existing.id },
        data: {
          fileName,
          filePath,
          mimeType: mimeType || 'image/jpeg',
          status: 'PENDING',
        },
      });

      logger.info({ phone, type, documentId: existing.id }, 'Document updated');
      return {
        success: true,
        documentId: existing.id,
        message: `Documento ${type} atualizado com sucesso.`,
      };
    }

    // Ensure uploads directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });

    const document = await prisma.document.create({
      data: {
        leadId: lead.id,
        type,
        fileName,
        filePath,
        mimeType: mimeType || 'image/jpeg',
        fileSize: 0,
        status: 'PENDING',
      },
    });

    // In a production scenario, we'd download the media from WhatsApp here
    // and possibly run OCR via Claude Vision
    // For MVP, we just register it

    logger.info({ phone, type, documentId: document.id }, 'Document registered');

    return {
      success: true,
      documentId: document.id,
      message: `Documento ${this.getDocLabel(type)} recebido com sucesso!`,
    };
  }

  async verifyDocument(documentId: string, verified: boolean): Promise<void> {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: verified ? 'VERIFIED' : 'REJECTED',
      },
    });
  }

  async getLeadDocuments(phone: string): Promise<Array<{ type: DocumentType; status: DocumentStatus }>> {
    const lead = await prisma.lead.findUnique({
      where: { phone },
      include: { documents: true },
    });

    if (!lead) return [];
    return lead.documents.map((d) => ({ type: d.type, status: d.status }));
  }

  private getDocLabel(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      RG_FRONT: 'Frente do RG',
      RG_BACK: 'Verso do RG',
      CPF: 'CPF',
      CNH: 'CNH',
      PROOF_OF_INCOME: 'Comprovante de renda',
      PROOF_OF_ADDRESS: 'Comprovante de endereço',
      SELFIE: 'Selfie com documento',
      BANK_STATEMENT: 'Extrato bancário',
      OTHER: 'Documento',
    };
    return labels[type] || type;
  }
}

export const documentService = new DocumentService();
