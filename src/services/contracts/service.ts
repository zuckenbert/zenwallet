import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import crypto from 'crypto';
import { ClicksignClient } from './clicksign';
import { QITechProvider, DisbursementRequest } from '../funding/qitech-provider';

class ContractService {
  private clicksign: ClicksignClient | null;
  private qitech: QITechProvider | null;

  constructor() {
    this.clicksign = env.CLICKSIGN_ENABLED ? new ClicksignClient() : null;
    this.qitech = env.QITECH_ENABLED ? new QITechProvider() : null;
  }

  async generate(applicationId: string): Promise<{
    success: boolean;
    contractId?: string;
    contractNumber?: string;
    signingUrl?: string;
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

    // If Clicksign is enabled, create the document there
    let signingUrl: string | undefined;
    let clicksignDocKey: string | undefined;

    if (this.clicksign && application.lead.name && application.lead.cpf && application.lead.email) {
      try {
        const contractHtml = this.buildContractHtml(terms, contractNumber);
        const result = await this.clicksign.createAndSendContract({
          contractContent: contractHtml,
          fileName: `contrato-${contractNumber}.html`,
          signerName: application.lead.name,
          signerEmail: application.lead.email,
          signerCpf: application.lead.cpf,
          signerPhone: application.lead.phone,
          deadlineDays: 7,
        });

        signingUrl = result.signingUrl;
        clicksignDocKey = result.documentKey;

        logger.info(
          { contractNumber, clicksignDocKey, signingUrl },
          'Contract sent to Clicksign',
        );
      } catch (error) {
        logger.error({ error, contractNumber }, 'Clicksign integration failed, falling back to internal');
      }
    }

    const contract = await prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          applicationId,
          contractNumber,
          terms: JSON.parse(JSON.stringify(terms)),
          status: 'SENT',
          clicksignDocumentKey: clicksignDocKey || null,
          clicksignSigningUrl: signingUrl || null,
        },
      });

      await tx.application.update({
        where: { id: applicationId },
        data: { status: 'CONTRACT_PENDING' },
      });

      await tx.lead.update({
        where: { id: application.leadId },
        data: { stage: 'CONTRACT_SENT' },
      });

      return created;
    });

    logger.info(
      { applicationId, contractId: contract.id, contractNumber },
      'Contract generated',
    );

    const message = signingUrl
      ? `Contrato nº ${contractNumber} gerado! Assine digitalmente pelo link:\n${signingUrl}\n\nVálido por 7 dias.`
      : `Contrato nº ${contractNumber} gerado com sucesso! Enviaremos o link para assinatura digital.`;

    return {
      success: true,
      contractId: contract.id,
      contractNumber,
      signingUrl,
      message,
    };
  }

  async sign(
    contractId: string,
    signatureHash: string,
    signatureIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { application: { include: { lead: true } } },
    });

    if (!contract) {
      return { success: false, message: 'Contrato não encontrado.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contractId },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          signatureHash,
          signatureIp,
        },
      });

      await tx.application.update({
        where: { id: contract.applicationId },
        data: { status: 'DISBURSEMENT_PENDING' },
      });

      await tx.lead.update({
        where: { id: contract.application.leadId },
        data: { stage: 'CONTRACT_SIGNED' },
      });
    });

    logger.info({ contractId }, 'Contract signed');

    // Trigger disbursement if QI Tech is enabled
    if (this.qitech) {
      try {
        await this.triggerDisbursement(contract);
      } catch (error) {
        logger.error({ error, contractId }, 'Auto-disbursement failed, manual disbursement required');
      }
    }

    return { success: true, message: 'Contrato assinado com sucesso! O valor será depositado em breve.' };
  }

  /**
   * Handle Clicksign webhook — called when document is signed via Clicksign
   */
  async handleClicksignWebhook(documentKey: string, eventName: string): Promise<void> {
    if (eventName !== 'auto_close' && eventName !== 'sign') return;

    const contract = await prisma.contract.findFirst({
      where: { clicksignDocumentKey: documentKey },
      include: { application: { include: { lead: true } } },
    });

    if (!contract) {
      logger.warn({ documentKey }, 'Clicksign webhook: contract not found');
      return;
    }

    if (contract.status === 'SIGNED') return;

    if (eventName === 'auto_close') {
      await this.sign(
        contract.id,
        `clicksign:${documentKey}`,
        'clicksign-webhook',
      );
      logger.info({ contractId: contract.id, documentKey }, 'Contract signed via Clicksign webhook');
    }
  }

  /**
   * Handle QI Tech webhook — called when disbursement status changes
   */
  async handleQITechWebhook(operationKey: string, status: string): Promise<void> {
    const contract = await prisma.contract.findFirst({
      where: { qitechOperationKey: operationKey },
      include: { application: true },
    });

    if (!contract) {
      logger.warn({ operationKey }, 'QI Tech webhook: contract not found');
      return;
    }

    if (status === 'settled' || status === 'disbursed') {
      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: contract.applicationId },
          data: { status: 'DISBURSED' },
        });

        await tx.lead.update({
          where: { id: contract.application.leadId },
          data: { stage: 'DISBURSED' },
        });
      });

      logger.info({ contractId: contract.id, operationKey }, 'Disbursement confirmed');
    }
  }

  private async triggerDisbursement(contract: {
    id: string;
    contractNumber: string;
    applicationId: string;
    application: {
      id: string;
      leadId: string;
      requestedAmount: unknown;
      approvedAmount: unknown;
      installments: number;
      interestRate: unknown;
      monthlyPayment: unknown;
      totalAmount: unknown;
      lead: {
        name: string | null;
        cpf: string | null;
        phone: string;
        email: string | null;
        birthDate: Date | null;
      };
    };
  }): Promise<void> {
    if (!this.qitech) return;

    const lead = contract.application.lead;
    if (!lead.name || !lead.cpf || !lead.email || !lead.birthDate) {
      logger.error({ contractId: contract.id }, 'Missing lead data for disbursement');
      return;
    }

    const request: DisbursementRequest = {
      borrowerName: lead.name,
      borrowerCpf: lead.cpf,
      borrowerPhone: lead.phone,
      borrowerEmail: lead.email,
      borrowerBirthDate: lead.birthDate.toISOString().split('T')[0],
      amount: Number(contract.application.approvedAmount || contract.application.requestedAmount),
      installments: contract.application.installments,
      interestRateMonthly: Number(contract.application.interestRate),
      monthlyPayment: Number(contract.application.monthlyPayment),
      totalAmount: Number(contract.application.totalAmount),
      firstDueDate: this.getFirstDueDate(),
      disbursementPixKey: lead.cpf,
      disbursementPixKeyType: 'cpf',
      contractNumber: contract.contractNumber,
    };

    const result = await this.qitech.createDebtAndDisburse(request);

    if (result.success && result.operationKey) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { qitechOperationKey: result.operationKey },
      });

      logger.info(
        { contractId: contract.id, operationKey: result.operationKey },
        'QI Tech disbursement triggered',
      );
    }
  }

  private buildContractHtml(
    terms: Record<string, unknown>,
    contractNumber: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Contrato ${contractNumber}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;line-height:1.6;color:#333}
h1{color:#1a1a2e;border-bottom:2px solid #16213e;padding-bottom:10px}
.field{margin:8px 0}.label{font-weight:bold;color:#16213e}
.signature-box{margin-top:40px;padding:20px;border:1px dashed #ccc;text-align:center}</style>
</head>
<body>
<h1>Contrato de Empréstimo Pessoal - ${contractNumber}</h1>
<h2>ZenWallet Crédito Digital</h2>

<h3>1. PARTES</h3>
<div class="field"><span class="label">Mutuário:</span> ${terms.borrowerName}</div>
<div class="field"><span class="label">CPF:</span> ${String(terms.borrowerCpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</div>

<h3>2. CONDIÇÕES DO EMPRÉSTIMO</h3>
<div class="field"><span class="label">Valor:</span> R$ ${Number(terms.loanAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
<div class="field"><span class="label">Parcelas:</span> ${terms.installments}x de R$ ${Number(terms.monthlyPayment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
<div class="field"><span class="label">Taxa de juros:</span> ${terms.interestRate}% a.m.</div>
<div class="field"><span class="label">Valor total:</span> R$ ${Number(terms.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
<div class="field"><span class="label">Primeiro vencimento:</span> ${terms.firstDueDate}</div>
<div class="field"><span class="label">Último vencimento:</span> ${terms.lastDueDate}</div>
<div class="field"><span class="label">Desembolso:</span> ${terms.disbursementMethod}</div>

<h3>3. CLÁUSULAS GERAIS</h3>
<p>3.1. O mutuário declara ter lido e compreendido todas as condições deste contrato.</p>
<p>3.2. O valor será creditado via PIX na conta informada em até 1 dia útil após a assinatura.</p>
<p>3.3. Em caso de atraso, incidirá multa de 2% sobre o valor da parcela e juros de mora de 1% ao mês.</p>
<p>3.4. O mutuário autoriza a consulta aos órgãos de proteção ao crédito.</p>
<p>3.5. Este contrato é regido pela legislação brasileira, em especial o Código de Defesa do Consumidor.</p>

<h3>4. CONSENTIMENTO LGPD</h3>
<p>O mutuário autoriza o tratamento dos seus dados pessoais para fins de análise de crédito,
formalização do empréstimo e cumprimento de obrigações legais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

<div class="signature-box">
<p><strong>Assinatura Digital</strong></p>
<p>Ao assinar este documento, o mutuário concorda com todas as condições acima.</p>
<p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
</div>
</body></html>`;
  }

  private generateContractNumber(): string {
    const year = new Date().getFullYear();
    const seq = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `ZW-${year}-${seq}`;
  }

  private getFirstDueDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(10);
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
