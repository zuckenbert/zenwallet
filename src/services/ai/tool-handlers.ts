import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { loanEngine } from '../credit/loan-engine';
import { creditAnalyzer } from '../credit/analyzer';
import { documentService } from '../documents/service';
import { contractService } from '../contracts/service';
import { AIToolResult } from '../../types';
import { LeadStage, DocumentType, LoanPurpose } from '@prisma/client';
import { validateCPF, maskCPF, validateEmail, normalizePhone } from '../../utils/validation';
import { env } from '../../config/env';

type ToolInput = Record<string, unknown>;

export async function handleToolCall(name: string, input: ToolInput): Promise<AIToolResult> {
  try {
    switch (name) {
      case 'get_lead_info':
        return await getLeadInfo(input);
      case 'request_lgpd_consent':
        return await requestLgpdConsent(input);
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
    logger.error({ error, tool: name }, 'Tool execution error');
    return {
      content: `Erro ao executar ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isError: true,
    };
  }
}

async function getLeadInfo(input: ToolInput): Promise<AIToolResult> {
  const phone = normalizePhone(String(input.phone));
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
      cpf: lead.cpf ? maskCPF(lead.cpf) : null,
      email: lead.email,
      monthlyIncome: lead.monthlyIncome ? Number(lead.monthlyIncome) : null,
      employmentType: lead.employmentType,
      stage: lead.stage,
      documentsCount: lead.documents.length,
      consentGiven: !!lead.consentGivenAt,
      kycVerified: lead.kycVerified,
      hasActiveApplication: lead.applications.length > 0,
      lastApplication: lead.applications[0] ? {
        id: lead.applications[0].id,
        status: lead.applications[0].status,
        amount: Number(lead.applications[0].requestedAmount),
      } : null,
    }),
  };
}

async function requestLgpdConsent(input: ToolInput): Promise<AIToolResult> {
  const phone = normalizePhone(String(input.phone));
  const granted = input.granted === true;

  if (!granted) {
    return {
      content: JSON.stringify({
        success: true,
        consentGranted: false,
        message: 'Cliente recusou o consentimento LGPD. Não é possível prosseguir com a coleta de dados pessoais.',
      }),
    };
  }

  const lead = await prisma.lead.upsert({
    where: { phone },
    update: {
      consentGivenAt: new Date(),
      consentIp: 'whatsapp',
    },
    create: {
      phone,
      consentGivenAt: new Date(),
      consentIp: 'whatsapp',
      stage: 'QUALIFYING',
    },
  });

  logger.info({ phone, leadId: lead.id }, 'LGPD consent registered');

  return {
    content: JSON.stringify({
      success: true,
      consentGranted: true,
      consentedAt: lead.consentGivenAt,
      message: 'Consentimento LGPD registrado com sucesso. Pode prosseguir com a coleta de dados.',
    }),
  };
}

async function updateLead(input: ToolInput): Promise<AIToolResult> {
  const phone = normalizePhone(String(input.phone));

  // Check LGPD consent for sensitive data (CPF, income, birthDate)
  const hasSensitiveData = input.cpf || input.monthlyIncome || input.birthDate || input.email;
  if (hasSensitiveData) {
    const existingLead = await prisma.lead.findUnique({ where: { phone } });
    if (!existingLead?.consentGivenAt) {
      return {
        content: JSON.stringify({
          success: false,
          errors: ['Consentimento LGPD não registrado. Solicite o consentimento do cliente antes de coletar dados pessoais.'],
        }),
        isError: true,
      };
    }
  }

  const updateData: Record<string, unknown> = {};
  const errors: string[] = [];

  if (input.name) {
    const name = String(input.name).trim();
    if (name.length < 2 || name.length > 200) {
      errors.push('Nome deve ter entre 2 e 200 caracteres.');
    } else {
      updateData.name = name;
    }
  }

  if (input.cpf) {
    const cpf = String(input.cpf).replace(/\D/g, '');
    if (!validateCPF(cpf)) {
      errors.push('CPF inválido. Verifique os números e tente novamente.');
    } else {
      const existing = await prisma.lead.findUnique({ where: { cpf } });
      if (existing && existing.phone !== phone) {
        errors.push('Este CPF já está cadastrado com outro telefone.');
      } else {
        updateData.cpf = cpf;
      }
    }
  }

  if (input.email) {
    const email = String(input.email).trim().toLowerCase();
    if (!validateEmail(email)) {
      errors.push('Email inválido.');
    } else {
      updateData.email = email;
    }
  }

  if (input.birthDate) {
    const date = new Date(String(input.birthDate));
    if (isNaN(date.getTime())) {
      errors.push('Data de nascimento inválida.');
    } else {
      const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        errors.push('Cliente deve ter pelo menos 18 anos.');
      } else if (age > 120) {
        errors.push('Data de nascimento inválida.');
      } else {
        updateData.birthDate = date;
      }
    }
  }

  if (input.monthlyIncome) {
    const income = Number(input.monthlyIncome);
    if (isNaN(income) || income < 0 || income > 10_000_000) {
      errors.push('Renda mensal inválida.');
    } else {
      updateData.monthlyIncome = income;
    }
  }

  if (input.employerName) updateData.employerName = String(input.employerName).trim();
  if (input.employmentType) updateData.employmentType = String(input.employmentType);

  if (errors.length > 0) {
    return { content: JSON.stringify({ success: false, errors }), isError: true };
  }

  if (Object.keys(updateData).length === 0) {
    return { content: JSON.stringify({ success: false, errors: ['Nenhum dado para atualizar.'] }), isError: true };
  }

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

  if (isNaN(amount) || amount < env.MIN_LOAN_AMOUNT || amount > env.MAX_LOAN_AMOUNT) {
    return {
      content: JSON.stringify({
        error: `Valor deve estar entre R$ ${env.MIN_LOAN_AMOUNT.toLocaleString('pt-BR')} e R$ ${env.MAX_LOAN_AMOUNT.toLocaleString('pt-BR')}.`,
      }),
      isError: true,
    };
  }

  if (isNaN(installments) || installments < env.MIN_INSTALLMENTS || installments > env.MAX_INSTALLMENTS) {
    return {
      content: JSON.stringify({
        error: `Parcelas devem estar entre ${env.MIN_INSTALLMENTS} e ${env.MAX_INSTALLMENTS}.`,
      }),
      isError: true,
    };
  }

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
  const phone = normalizePhone(String(input.phone));
  const amount = Number(input.amount);
  const installments = Number(input.installments);
  const purpose = input.purpose as LoanPurpose | undefined;

  const lead = await prisma.lead.findUnique({ where: { phone } });
  if (!lead) {
    return { content: JSON.stringify({ success: false, error: 'Lead não encontrado. Colete os dados primeiro.' }), isError: true };
  }

  if (!lead.name || !lead.cpf) {
    const missing: string[] = [];
    if (!lead.name) missing.push('nome completo');
    if (!lead.cpf) missing.push('CPF');
    return {
      content: JSON.stringify({
        success: false,
        error: `Dados obrigatórios faltando: ${missing.join(', ')}. Colete antes de criar a proposta.`,
      }),
      isError: true,
    };
  }

  const existingApp = await prisma.application.findFirst({
    where: {
      leadId: lead.id,
      status: { notIn: ['CANCELLED', 'DENIED', 'DISBURSED'] },
    },
  });

  if (existingApp) {
    return {
      content: JSON.stringify({
        success: false,
        error: `Já existe uma proposta ativa (${existingApp.id}) com status ${existingApp.status}.`,
      }),
      isError: true,
    };
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
  const phone = normalizePhone(String(input.phone));
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
  const phone = normalizePhone(String(input.phone));
  const docType = String(input.documentType) as DocumentType;
  const mediaUrl = input.mediaUrl ? String(input.mediaUrl) : undefined;
  const mediaType = input.mediaType ? String(input.mediaType) : 'image/jpeg';

  const result = await documentService.registerDocument(phone, docType, mediaUrl, mediaType);
  return { content: JSON.stringify(result) };
}

async function runCreditAnalysis(input: ToolInput): Promise<AIToolResult> {
  const phone = normalizePhone(String(input.phone));
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
  const phone = normalizePhone(String(input.phone));
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
  const phone = normalizePhone(String(input.phone));
  const stage = String(input.stage) as LeadStage;

  await prisma.lead.update({
    where: { phone },
    data: { stage },
  });

  return { content: JSON.stringify({ success: true, stage }) };
}
