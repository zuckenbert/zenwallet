import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { v4 as uuid } from 'uuid';

class ContractService {
  async generate(applicationId: string): Promise<{
    success: boolean;
    contractId?: string;
    contractNumber?: string;
    message: string;
  }> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { lead: true, creditAnalysis: true },
    });

    if (!application) {
      return { success: false, message: 'Proposta não encontrada.' };
    }

    if (application.status !== 'APPROVED') {
      return { success: false, message: 'Proposta precisa estar aprovada para gerar contrato.' };
    }

    // Check if contract already exists
    const existing = await prisma.contract.findUnique({
      where: { applicationId },
    });

    if (existing) {
      return {
        success: true,
        contractId: existing.id,
        contractNumber: existing.contractNumber,
        message: 'Contrato já gerado anteriormente.',
      };
    }

    const contractNumber = this.generateContractNumber();
    const approvedAmount = application.approvedAmount || application.requestedAmount;

    const terms = {
      borrowerName: application.lead.name,
      borrowerCpf: application.lead.cpf,
      borrowerPhone: application.lead.phone,
      loanAmount: Number(approvedAmount),
      installments: application.installments,
      interestRate: Number(application.interestRate),
      monthlyPayment: Number(application.monthlyPayment),
      totalAmount: Number(application.totalAmount),
      firstDueDate: this.getFirstDueDate(),
      lastDueDate: this.getLastDueDate(application.installments),
      disbursementMethod: 'PIX',
      generatedAt: new Date().toISOString(),
    };

    const contract = await prisma.contract.create({
      data: {
        applicationId,
        contractNumber,
        terms: JSON.parse(JSON.stringify(terms)),
        status: 'SENT',
      },
    });

    // Update application status
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'CONTRACT_PENDING' },
    });

    // Update lead stage
    await prisma.lead.update({
      where: { id: application.leadId },
      data: { stage: 'CONTRACT_SENT' },
    });

    logger.info(
      { applicationId, contractId: contract.id, contractNumber },
      'Contract generated',
    );

    return {
      success: true,
      contractId: contract.id,
      contractNumber,
      message: `Contrato nº ${contractNumber} gerado com sucesso! Enviaremos o link para assinatura digital.`,
    };
  }

  async sign(
    contractId: string,
    signatureHash: string,
    signatureIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { application: true },
    });

    if (!contract) {
      return { success: false, message: 'Contrato não encontrado.' };
    }

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signatureHash,
        signatureIp,
      },
    });

    // Update application
    await prisma.application.update({
      where: { id: contract.applicationId },
      data: { status: 'DISBURSEMENT_PENDING' },
    });

    // Update lead
    await prisma.lead.update({
      where: { id: contract.application.leadId },
      data: { stage: 'CONTRACT_SIGNED' },
    });

    logger.info({ contractId }, 'Contract signed');

    return { success: true, message: 'Contrato assinado com sucesso! O valor será depositado em breve.' };
  }

  private generateContractNumber(): string {
    const year = new Date().getFullYear();
    const seq = uuid().slice(0, 8).toUpperCase();
    return `ZW-${year}-${seq}`;
  }

  private getFirstDueDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(10); // Due on 10th
    return date.toISOString().split('T')[0];
  }

  private getLastDueDate(installments: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + installments);
    date.setDate(10);
    return date.toISOString().split('T')[0];
  }
}

export const contractService = new ContractService();
