import { describe, it, expect } from 'vitest';

// Test the math independently of env/prisma dependencies

function calculatePMT(principal: number, monthlyRate: number, periods: number): number {
  if (monthlyRate === 0) return principal / periods;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, periods)) /
    (Math.pow(1 + monthlyRate, periods) - 1);
}

const MIN_RATE = 0.0099;

function simulate(amount: number, installments: number, baseRate = 0.0199, monthlyIncome?: number) {
  let rate = baseRate;

  if (monthlyIncome) {
    const commitmentRatio = amount / (monthlyIncome * installments);
    if (commitmentRatio > 0.5) rate += 0.005;
    if (commitmentRatio < 0.2) rate -= 0.003;
    if (monthlyIncome > 10000) rate -= 0.002;
  }

  if (installments > 24) rate += 0.003;
  if (installments > 36) rate += 0.002;

  rate = Math.max(MIN_RATE, rate);

  const monthlyPayment = calculatePMT(amount, rate, installments);
  const totalAmount = monthlyPayment * installments;
  const totalInterest = totalAmount - amount;

  return {
    amount,
    installments,
    interestRate: Math.round(rate * 10000) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };
}

describe('Loan Engine', () => {
  describe('PMT Calculation', () => {
    it('should calculate correct monthly payment for R$ 10.000 in 12x', () => {
      const result = simulate(10000, 12);
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.monthlyPayment).toBeLessThan(10000);
      expect(result.monthlyPayment).toBeCloseTo(945, -1);
    });

    it('should calculate correct monthly payment for R$ 50.000 in 48x', () => {
      const result = simulate(50000, 48);
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.totalAmount).toBeGreaterThan(50000);
    });

    it('should return principal/periods when rate is 0', () => {
      const pmt = calculatePMT(12000, 0, 12);
      expect(pmt).toBe(1000);
    });

    it('should calculate total amount greater than principal', () => {
      const result = simulate(20000, 24);
      expect(result.totalAmount).toBeGreaterThan(result.amount);
    });

    it('should calculate positive interest', () => {
      const result = simulate(20000, 24);
      expect(result.totalInterest).toBeGreaterThan(0);
    });
  });

  describe('Rate floor', () => {
    it('should never produce a rate below minimum', () => {
      // High income + low amount + short term = maximum discounts
      const result = simulate(1000, 3, 0.0199, 50000);
      expect(result.interestRate).toBeGreaterThanOrEqual(0.99);
    });

    it('should apply risk premium for long terms', () => {
      const short = simulate(10000, 12);
      const long = simulate(10000, 48);
      expect(long.interestRate).toBeGreaterThan(short.interestRate);
    });

    it('should apply risk premium for high commitment ratio', () => {
      const low = simulate(5000, 12, 0.0199, 10000);
      const high = simulate(50000, 12, 0.0199, 5000);
      expect(high.interestRate).toBeGreaterThan(low.interestRate);
    });
  });

  describe('Simulation bounds', () => {
    it('should handle minimum amount', () => {
      const result = simulate(1000, 3);
      expect(result.monthlyPayment).toBeGreaterThan(0);
    });

    it('should handle maximum installments', () => {
      const result = simulate(100000, 48);
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.installments).toBe(48);
    });
  });

  describe('Affordability check', () => {
    it('should identify affordable loan', () => {
      const result = simulate(10000, 24);
      const monthlyIncome = 8000;
      const ratio = result.monthlyPayment / monthlyIncome;
      expect(ratio).toBeLessThan(0.35);
    });

    it('should identify unaffordable loan', () => {
      const result = simulate(100000, 12);
      const monthlyIncome = 3000;
      const ratio = result.monthlyPayment / monthlyIncome;
      expect(ratio).toBeGreaterThan(0.35);
    });
  });
});
