import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { loanEngine } from '../credit/loan-engine';
import { creditAnalyzer } from '../credit/analyzer';
import { documentService } from '../documents/service';
import { contractService } from '../contracts/service';
import { AIToolResult } from '../../types';
import { LeadStage, DocumentType, ApplicationStatus, LoanPurpose } from '@prisma/client';

type ToolInput = Record<string, unknown>;

export async function handleToolCall(name: string, input: ToolInput): Promise<AIToolResult> {
  try {
    switch (name) {
      case 'get_lead_info':
        return await getLeadInfo(input);
      case 'update_lead':
        return await updateLead(input);
      case 'simulate_loan':
        return await simulateLoan(input);
      case 'create_application':
        return await createApplication(input);
      case 'check_required_documents':
        return await checkDocuments(input);
      case 'process_document':
        return await processDocument(input);
      case 'run_credit_analysis':
        return await runCreditAnalysis(input);
      case 'generate_contract':
        return await generateContract(input);
      case 'get_application_status':
        return await getApplicationStatus(input);
      case 'update_lead_stage':
        return await updateLeadStage(input);
      default:
        return { content: `Tool "${name}" not found`, isError: true };
    }
  } catch (error) {
    logger.error({ error, tool: name, input }, 'Tool execution error');
    return {
      content: `Erro ao executar ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isError: true,
    };
  }
}

async function getLeadInfo(input: ToolInput): Promise<AIToolResult> {
  const phone = String(input.phone);
  const lead = await prisma.lead.findUnique({
    where: { phone },
    include: {
      applications: { orderBy: { createdAt: 'desc' }, take: 1 },
      documents: true,
    },
  });

  if (!lead) {
    return { content: JSON.stringify({ found: false, message: 'Lead não encontrado. É um novo cliente.' }) };
  }

  return {
    content: JSON.stringify({
      found: true,
      id: lead.id,
      name: lead.name,
      cpf: lead.cpf ? `***${lead.cpf.slice(-4)}` : null,
      email: lead.email,
      monthlyIncome: lead.monthlyIncome ? Number(lead.monthlyIncome) : null,
      employmentType: lead.employmentType,
      stage: lead.stage,
      documentsCount: lead.documents.length,
      hasActiveApplication: lead.applications.length > 0,
      lastApplication: lead.applications[0] ? {
        id: lead.applications[0].id,
        status: lead.applications[0].status,
        amount: Number(lead.applications[0].requestedAmount),
      } : null,
    }),
  };
}

async function updateLead(input: ToolInput): Promise<AIToolResult> {
  const phone = String(input.phone);

  const updateData: Record<string, unknown> = {};
  if (input.name) updateData.name = String(input.name);
  if (input.cpf) updateData.cpf = String(input.cpf).replace(/\D/g, '');
  if (input.email) updateData.email = String(input.email);
  if (input.birthDate) updateData.birthDate = new Date(String(input.birthDate));
  if (input.monthlyIncome) updateData.monthlyIncome = Number(input.monthlyIncome);
  if (input.employerName) updateData.employerName = String(input.employerName);
  if (input.employmentType) updateData.employmentType = String(input.employmentType);

  const lead = await prisma.lead.upsert({
    where: { phone },
    update: updateData,
    create: { phone, ...updateData },
  });

  return {
    content: JSON.stringify({
      success: true,
      leadId: lead.id,
      message: `Dados atualizados: ${Object.keys(updateData).join(', ')}`,
    }),
  };
}

async function simulateLoan(input: ToolInput): Promise<AIToolResult> {
  const amount = Number(input.amount);
  const installments = Number(input.installments);
  const monthlyIncome = input.monthlyIncome ? Number(input.monthlyIncome) : undefined;

  const simulation = loanEngine.simulate(amount, installments, monthlyIncome);

  return {
    content: JSON.stringify({
      ...simulation,
      formatted: {
        amount: `R$ ${simulation.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        monthlyPayment: `R$ ${simulation.monthlyPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        totalAmount: `R$ ${simulation.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        totalInterest: `R$ ${simulation.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        interestRate: `${simulation.interestRate.toFixed(2)}% a.m.`,
        cet: `${simulation.cet.toFixed(2)}% a.a.`,
      },
    }),
  };
}

async function createApplication(input: ToolInput): Promise<AIToolResult> {
  const phone = String(input.phone);
  const amount = Number(input.amount);
  const installments = Number(input.installments);
  const purpose = input.purpose as LoanPurpose | undefined;

  const lead = await prisma.lead.findUnique({ where: { phone } });
  if (!lead) {
    return { content: JSON.stringify({ success: false, error: 'Lead não encontrado. Colete os dados primeiro.' }), isError: true };
  }

  const simulation = loanEngine.simulate(amount, installments, lead.monthlyIncome ? Number(lead.monthlyIncome) : undefined);

  const application = await prisma.application.create({
    data: {
      leadId: lead.id,
      requestedAmount: amount,
      installments,
      interestRate: simulation.interestRate,
      monthlyPayment: simulation.monthlyPayment,
      totalAmount: simulation.totalAmount,
      purpose: purpose || 'OTHER',
      status: 'SIMULATED',
    },
  });

  await prisma.lead.update({
    where: { phone },
    data: { stage: 'DOCUMENTS_PENDING' },
  });

  return {
    content: JSON.stringify({
      success: true,
      applicationId: application.id,
      status: application.status,
      message: 'Proposta criada. Próximo passo: coleta de documentos.',
    }),
  };
}

async function checkDocuments(input: ToolInput): Promise<AIToolResult> {
  const phone = String(input.phone);
  const lead = await prisma.lead.findUnique({
    where: { phone },
    include: { documents: true },
  });

  if (!lead) {
    return { content: JSON.stringify({ error: 'Lead não encontrado' }), isError: true };
  }

  const requiredDocs: DocumentType[] = ['RG_FRONT', 'RG_BACK', 'PROOF_OF_INCOME', 'PROOF_OF_ADDRESS', 'SELFIE'];
  const sentDocs = lead.documents.map((d) => d.type);
  const missingDocs = requiredDocs.filter((d) => !sentDocs.includes(d));
  const docLabels: Record<string, string> = {
    RG_FRONT: 'Frente do RG',
    RG_BACK: 'Verso do RG',
    PROOF_OF_INCOME: 'Comprovante de renda',
    PROOF_OF_ADDRESS: 'Comprovante de endereço',
    SELFIE: 'Selfie com documento',
  };

  return {
    content: JSON.stringify({
      total: requiredDocs.length,
      sent: sentDocs.length,
      missing: missingDocs.map((d) => ({ type: d, label: docLabels[d] || d })),
      allComplete: missingDocs.length === 0,
    }),
  };
}

async function processDocument(input: ToolInput): Promise<AIToolResult> {
  const phone = String(input.phone);
  const docType = String(input.documentType) as DocumentType;
  const mediaUrl = input.mediaUrl ? String(input.mediaUrl) : undefined;
  const mediaType = input.mediaType ? String(input.mediaType) : 'image/jpeg';

  const result = await documentService.registerDocument(phone, docType, mediaUrl, mediaType);
  return { content: JSON.stringify(result) };
}

async function runCreditAnalysis(input: ToolInput): Promise<AIToolResult> {
  const phone = String(input.phone);
  const applicationId = String(input.applicationId);

  const result = await creditAnalyzer.analyze(phone, applicationId);
  return { content: JSON.stringify(result) };
}

async function generateContract(input: ToolInput): Promise<AIToolResult> {
  const applicationId = String(input.applicationId);
  const result = await contractService.generate(applicationId);
  return { content: JSON.stringify(result) };
}

async function getApplicationStatus(input: ToolInput): Promise<AIToolResult> {
  const phone = String(input.phone);
  const lead = await prisma.lead.findUnique({
    where: { phone },
    include: {
      applications: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { creditAnalysis: true, contract: true },
      },
    },
  });

  if (!lead || lead.applications.length === 0) {
    return { content: JSON.stringify({ hasApplication: false, message: 'Nenhuma proposta encontrada.' }) };
  }

  const app = lead.applications[0];
  return {
    content: JSON.stringify({
      hasApplication: true,
      applicationId: app.id,
      status: app.status,
      amount: Number(app.requestedAmount),
      approvedAmount: app.approvedAmount ? Number(app.approvedAmount) : null,
      installments: app.installments,
      monthlyPayment: app.monthlyPayment ? Number(app.monthlyPayment) : null,
      creditDecision: app.creditAnalysis?.decision || null,
      contractStatus: app.contract?.status || null,
    }),
  };
}

async function updateLeadStage(input: ToolInput): Promise<AIToolResult> {
  const phone = String(input.phone);
  const stage = String(input.stage) as LeadStage;

  await prisma.lead.update({
    where: { phone },
    data: { stage },
  });

  return { content: JSON.stringify({ success: true, stage }) };
}
