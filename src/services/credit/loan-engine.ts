import { env } from '../../config/env';
import { LoanSimulation } from '../../types';

const MIN_RATE = 0.0099; // 0.99% monthly floor

class LoanEngine {
  simulate(amount: number, installments: number, monthlyIncome?: number): LoanSimulation {
    const clampedAmount = Math.max(env.MIN_LOAN_AMOUNT, Math.min(env.MAX_LOAN_AMOUNT, amount));
    const clampedInstallments = Math.max(env.MIN_INSTALLMENTS, Math.min(env.MAX_INSTALLMENTS, installments));

    const baseRate = env.BASE_INTEREST_RATE / 100;
    let rate = baseRate;

    // Risk-based pricing adjustments
    if (monthlyIncome) {
      const commitmentRatio = clampedAmount / (monthlyIncome * clampedInstallments);
      if (commitmentRatio > 0.5) rate += 0.005;
      if (commitmentRatio < 0.2) rate -= 0.003;
      if (monthlyIncome > 10000) rate -= 0.002;
    }

    if (clampedInstallments > 24) rate += 0.003;
    if (clampedInstallments > 36) rate += 0.002;

    // Floor: never go below minimum rate
    rate = Math.max(MIN_RATE, rate);

    // PMT calculation
    const monthlyPayment = this.calculatePMT(clampedAmount, rate, clampedInstallments);
    const totalAmount = monthlyPayment * clampedInstallments;
    const totalInterest = totalAmount - clampedAmount;

    // IOF (Imposto sobre Operações Financeiras)
    // Simplified: 0.38% flat + 0.0082% per day (capped at 365 days)
    const avgDays = (clampedInstallments * 30) / 2;
    const iof = clampedAmount * 0.0038 + clampedAmount * 0.000082 * Math.min(avgDays, 365);

    // CET (Custo Efetivo Total) - annualized, includes IOF spread over installments
    const monthlyEffective = rate + (iof / clampedAmount) / clampedInstallments;
    const cet = (Math.pow(1 + monthlyEffective, 12) - 1) * 100;

    return {
      amount: clampedAmount,
      installments: clampedInstallments,
      interestRate: Math.round(rate * 10000) / 100, // percentage with 2 decimals
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      iof: Math.round(iof * 100) / 100,
      cet: Math.round(cet * 100) / 100,
    };
  }

  private calculatePMT(principal: number, monthlyRate: number, periods: number): number {
    if (monthlyRate === 0) return principal / periods;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, periods)) /
      (Math.pow(1 + monthlyRate, periods) - 1);
  }

  checkAffordability(monthlyPayment: number, monthlyIncome: number): {
    affordable: boolean;
    commitmentRatio: number;
    maxPayment: number;
  } {
    const maxCommitment = 0.35;
    const maxPayment = monthlyIncome * maxCommitment;
    const commitmentRatio = monthlyPayment / monthlyIncome;

    return {
      affordable: commitmentRatio <= maxCommitment,
      commitmentRatio: Math.round(commitmentRatio * 10000) / 100,
      maxPayment: Math.round(maxPayment * 100) / 100,
    };
  }

  generateSchedule(amount: number, rate: number, installments: number): Array<{
    number: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }> {
    const monthlyRate = rate / 100;
    const pmt = this.calculatePMT(amount, monthlyRate, installments);
    let balance = amount;
    const schedule = [];

    for (let i = 1; i <= installments; i++) {
      const interest = balance * monthlyRate;
      const principal = pmt - interest;
      balance -= principal;

      schedule.push({
        number: i,
        payment: Math.round(pmt * 100) / 100,
        principal: Math.round(principal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        balance: Math.max(0, Math.round(balance * 100) / 100),
      });
    }

    return schedule;
  }
}

export const loanEngine = new LoanEngine();
