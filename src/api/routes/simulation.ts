import { Router, Request, Response } from 'express';
import { loanEngine } from '../../services/credit/loan-engine';
import { z } from 'zod';

export const simulationRouter = Router();

const simulationSchema = z.object({
  amount: z.number().min(1000).max(100000),
  installments: z.number().int().min(3).max(48),
  monthlyIncome: z.number().positive().optional(),
});

// Public simulation endpoint
simulationRouter.post('/', (req: Request, res: Response) => {
  const { amount, installments, monthlyIncome } = simulationSchema.parse(req.body);

  const simulation = loanEngine.simulate(amount, installments, monthlyIncome);
  const affordability = monthlyIncome
    ? loanEngine.checkAffordability(simulation.monthlyPayment, monthlyIncome)
    : null;

  res.json({
    simulation,
    affordability,
  });
});

// Amortization schedule
simulationRouter.post('/schedule', (req: Request, res: Response) => {
  const { amount, installments } = simulationSchema.parse(req.body);

  const simulation = loanEngine.simulate(amount, installments);
  const schedule = loanEngine.generateSchedule(amount, simulation.interestRate, installments);

  res.json({
    simulation,
    schedule,
  });
});
