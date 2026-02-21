import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { parsePagination, paginationMeta } from '../../utils/pagination';

export const applicationsRouter = Router();

// List applications with filters
applicationsRouter.get('/', async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query as { page?: string; limit?: string });
  const status = req.query.status as string | undefined;

  const where: Prisma.ApplicationWhereInput = {};
  if (status) where.status = status as Prisma.EnumApplicationStatusFilter;

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        lead: { select: { name: true, phone: true } },
        creditAnalysis: true,
        contract: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.application.count({ where }),
  ]);

  res.json({
    data: applications,
    pagination: paginationMeta(page, limit, total),
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

  // Use transaction to update both atomically
  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.update({
      where: { id: req.params.id as string },
      data: {
        status: decision,
        denialReason: decision === 'DENIED' ? reason : null,
      },
      include: { lead: true },
    });

    await tx.lead.update({
      where: { id: application.leadId },
      data: { stage: decision === 'APPROVED' ? 'APPROVED' : 'DENIED' },
    });

    return application;
  });

  res.json(result);
});
