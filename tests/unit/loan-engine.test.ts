import { describe, it, expect } from 'vitest';

// Direct import of the loan engine logic for testing
// We test the math independently of the env/prisma dependencies

function calculatePMT(principal: number, monthlyRate: number, periods: number): number {
  if (monthlyRate === 0) return principal / periods;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, periods)) /
    (Math.pow(1 + monthlyRate, periods) - 1);
}

function simulate(amount: number, installments: number, baseRate = 0.0199) {
  const monthlyPayment = calculatePMT(amount, baseRate, installments);
  const totalAmount = monthlyPayment * installments;
  const totalInterest = totalAmount - amount;

  return {
    amount,
    installments,
    interestRate: baseRate * 100,
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
      // At 1.99% monthly, 12 installments, PMT should be around R$ 945
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
