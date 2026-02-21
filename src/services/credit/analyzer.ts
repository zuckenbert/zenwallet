import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { CreditCheckResult } from '../../types';
import { CreditDecision, FraudRisk } from '@prisma/client';

interface BureauProvider {
  name: string;
  checkCredit(cpf: string): Promise<{
    score: number;
    fraudRisk: FraudRisk;
    existingDebts: number;
  }>;
}

/**
 * Mock Serasa provider - returns simulated data for MVP
 * Replace with real API integration when ready
 */
class MockSerasaProvider implements BureauProvider {
  name = 'serasa_mock';

  async checkCredit(cpf: string): Promise<{ score: number; fraudRisk: FraudRisk; existingDebts: number }> {
    // Deterministic mock based on CPF digits for consistent testing
    const cpfSum = cpf.split('').reduce((acc, d) => acc + parseInt(d || '0', 10), 0);
    const score = 300 + ((cpfSum * 17) % 700); // 300-999 range
    const fraudRisk: FraudRisk = score > 700 ? 'LOW' : score > 400 ? 'MEDIUM' : 'HIGH';
    const existingDebts = Math.round((1000 - score) * 5.5);

    logger.info({ cpf: `***${cpf.slice(-4)}`, score, provider: this.name }, 'Mock credit check');

    return { score, fraudRisk, existingDebts };
  }
}

/**
 * Real Serasa provider stub - implement when you have API access
 */
class SerasaProvider implements BureauProvider {
  name = 'serasa';

  async checkCredit(cpf: string): Promise<{ score: number; fraudRisk: FraudRisk; existingDebts: number }> {
    // TODO: Implement real Serasa API call
    // const response = await fetch(`${env.SERASA_API_URL}/score`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${env.SERASA_API_KEY}` },
    //   body: JSON.stringify({ cpf }),
    // });
    throw new Error('Serasa provider not yet implemented. Set SERASA_ENABLED=false to use mock.');
  }
}

class CreditAnalyzer {
  private provider: BureauProvider;

  constructor() {
    this.provider = env.SERASA_ENABLED ? new SerasaProvider() : new MockSerasaProvider();
  }

  async analyze(phone: string, applicationId: string): Promise<CreditCheckResult> {
    const lead = await prisma.lead.findUnique({ where: { phone } });
    if (!lead) throw new Error('Lead not found');
    if (!lead.cpf) throw new Error('CPF not registered');

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new Error('Application not found');

    // 1. Bureau credit check
    const bureauResult = await this.provider.checkCredit(lead.cpf);

    // 2. Calculate debt-to-income ratio
    const monthlyIncome = lead.monthlyIncome ? Number(lead.monthlyIncome) : 0;
    const monthlyPayment = application.monthlyPayment ? Number(application.monthlyPayment) : 0;
    const existingDebtPayments = bureauResult.existingDebts * 0.03; // Estimate 3% of total debt as monthly payments
    const totalMonthlyDebt = monthlyPayment + existingDebtPayments;
    const debtToIncome = monthlyIncome > 0 ? totalMonthlyDebt / monthlyIncome : 999;

    // 3. Decision engine
    const { decision, reason, maxApprovedAmount, suggestedRate } = this.makeDecision(
      bureauResult.score,
      bureauResult.fraudRisk,
      debtToIncome,
      Number(application.requestedAmount),
      monthlyIncome,
    );

    // 4. Save analysis
    const analysis = await prisma.creditAnalysis.create({
      data: {
        applicationId,
        creditScore: bureauResult.score,
        scoreProvider: this.provider.name,
        fraudRisk: bureauResult.fraudRisk,
        incomeVerified: monthlyIncome > 0,
        debtToIncome,
        existingDebts: bureauResult.existingDebts,
        decision: decision as CreditDecision,
        decisionReason: reason,
        rawResponse: JSON.parse(JSON.stringify(bureauResult)),
        analyzedAt: new Date(),
      },
    });

    // 5. Update application status
    const newStatus = decision === 'APPROVED' ? 'APPROVED' : decision === 'DENIED' ? 'DENIED' : 'UNDER_REVIEW';
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        approvedAmount: maxApprovedAmount,
        denialReason: decision === 'DENIED' ? reason : null,
      },
    });

    // 6. Update lead stage
    const newStage = decision === 'APPROVED' ? 'APPROVED' : decision === 'DENIED' ? 'DENIED' : 'ANALYZING';
    await prisma.lead.update({
      where: { phone },
      data: { stage: newStage },
    });

    logger.info(
      { phone, applicationId, score: bureauResult.score, decision, analysisId: analysis.id },
      'Credit analysis completed',
    );

    return {
      score: bureauResult.score,
      provider: this.provider.name,
      fraudRisk: bureauResult.fraudRisk,
      debtToIncome: Math.round(debtToIncome * 10000) / 100,
      existingDebts: bureauResult.existingDebts,
      decision: decision as 'APPROVED' | 'DENIED' | 'MANUAL_REVIEW',
      reason,
      maxApprovedAmount,
      suggestedRate,
    };
  }

  private makeDecision(
    score: number,
    fraudRisk: FraudRisk,
    debtToIncome: number,
    requestedAmount: number,
    monthlyIncome: number,
  ): {
    decision: string;
    reason: string;
    maxApprovedAmount?: number;
    suggestedRate?: number;
  } {
    // Hard denials
    if (fraudRisk === 'HIGH') {
      return { decision: 'DENIED', reason: 'Alto risco de fraude identificado.' };
    }
    if (score < 300) {
      return { decision: 'DENIED', reason: 'Score de crédito abaixo do mínimo.' };
    }
    if (debtToIncome > 0.7) {
      return { decision: 'DENIED', reason: 'Comprometimento de renda acima do limite.' };
    }

    // Manual review
    if (score < 500 || fraudRisk === 'MEDIUM' || debtToIncome > 0.5) {
      const maxAmount = Math.min(requestedAmount, monthlyIncome * 6);
      return {
        decision: 'MANUAL_REVIEW',
        reason: 'Análise precisa de revisão manual.',
        maxApprovedAmount: maxAmount,
      };
    }

    // Approval with possible amount adjustment
    let maxAmount = requestedAmount;
    let suggestedRate = 1.99;

    if (score >= 800) {
      maxAmount = Math.min(requestedAmount, monthlyIncome * 15);
      suggestedRate = 1.49;
    } else if (score >= 650) {
      maxAmount = Math.min(requestedAmount, monthlyIncome * 10);
      suggestedRate = 1.99;
    } else {
      maxAmount = Math.min(requestedAmount, monthlyIncome * 6);
      suggestedRate = 2.49;
    }

    return {
      decision: 'APPROVED',
      reason: `Aprovado com score ${score}. Perfil de crédito adequado.`,
      maxApprovedAmount: Math.round(maxAmount * 100) / 100,
      suggestedRate,
    };
  }
}

export const creditAnalyzer = new CreditAnalyzer();
