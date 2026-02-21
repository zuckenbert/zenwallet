import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { z } from 'zod';

export const leadsRouter = Router();

// List leads with pagination and filters
leadsRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const stage = req.query.stage as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Prisma.LeadWhereInput = {};
  if (stage) where.stage = stage as Prisma.EnumLeadStageFilter;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { cpf: { contains: search } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        applications: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { documents: true, conversations: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({
    data: leads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single lead with full details
leadsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      applications: {
        include: { creditAnalysis: true, contract: true },
        orderBy: { createdAt: 'desc' },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      conversations: {
        include: { messages: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  res.json(lead);
});

// Update lead stage manually
leadsRouter.patch('/:id/stage', async (req: Request, res: Response) => {
  const schema = z.object({
    stage: z.enum([
      'NEW', 'QUALIFYING', 'SIMULATING', 'DOCUMENTS_PENDING',
      'ANALYZING', 'APPROVED', 'DENIED', 'CONTRACT_SENT',
      'CONTRACT_SIGNED', 'DISBURSED', 'COMPLETED', 'CANCELLED',
    ]),
  });

  const { stage } = schema.parse(req.body);

  const lead = await prisma.lead.update({
    where: { id: req.params.id as string },
    data: { stage },
  });

  res.json(lead);
});
