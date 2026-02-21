import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export const applicationsRouter = Router();

// List applications with filters
applicationsRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string | undefined;

  const where: Prisma.ApplicationWhereInput = {};
  if (status) where.status = status as Prisma.EnumApplicationStatusFilter;

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        lead: { select: { name: true, phone: true, cpf: true } },
        creditAnalysis: true,
        contract: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.application.count({ where }),
  ]);

  res.json({
    data: applications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// Get single application
applicationsRouter.get('/:id', async (req: Request, res: Response) => {
  const application = await prisma.application.findUnique({
    where: { id: req.params.id as string },
    include: {
      lead: true,
      creditAnalysis: true,
      contract: true,
    },
  });

  if (!application) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  res.json(application);
});

// Manually approve/deny application (admin override)
applicationsRouter.patch('/:id/decision', async (req: Request, res: Response) => {
  const { decision, reason } = req.body;

  if (!['APPROVED', 'DENIED'].includes(decision)) {
    res.status(400).json({ error: 'Decision must be APPROVED or DENIED' });
    return;
  }

  const application = await prisma.application.update({
    where: { id: req.params.id as string },
    data: {
      status: decision,
      denialReason: decision === 'DENIED' ? reason : null,
    },
    include: { lead: true },
  });

  // Update lead stage
  await prisma.lead.update({
    where: { id: application.leadId },
    data: { stage: decision === 'APPROVED' ? 'APPROVED' : 'DENIED' },
  });

  res.json(application);
});
