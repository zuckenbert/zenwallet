import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { contractService } from '../../services/contracts/service';
import { parsePagination, paginationMeta } from '../../utils/pagination';
import crypto from 'crypto';

export const contractsRouter = Router();

// List contracts
contractsRouter.get('/', async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, string>);

  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      include: {
        application: {
          include: { lead: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.contract.count(),
  ]);

  res.json({
    data: contracts,
    pagination: paginationMeta(page, limit, total),
  });
});

// Public: View contract (no auth needed - accessed via unique link)
contractsRouter.get('/:contractNumber/view', async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({
    where: { contractNumber: req.params.contractNumber as string },
    include: {
      application: {
        include: { lead: { select: { name: true } } },
      },
    },
  });

  if (!contract) {
    res.status(404).json({ error: 'Contrato não encontrado' });
    return;
  }

  // Mark as viewed
  if (contract.status === 'SENT') {
    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'VIEWED' },
    });
  }

  res.json({
    contractNumber: contract.contractNumber,
    borrowerName: contract.application.lead.name,
    terms: contract.terms,
    status: contract.status,
    canSign: contract.status !== 'SIGNED' && contract.status !== 'CANCELLED',
  });
});

// Public: Sign contract
contractsRouter.post('/:contractNumber/sign', async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({
    where: { contractNumber: req.params.contractNumber as string },
  });

  if (!contract) {
    res.status(404).json({ error: 'Contrato não encontrado' });
    return;
  }

  if (contract.status === 'SIGNED') {
    res.status(400).json({ error: 'Contrato já assinado' });
    return;
  }

  const signatureHash = crypto
    .createHash('sha256')
    .update(`${contract.id}-${Date.now()}-${req.ip}`)
    .digest('hex');

  const result = await contractService.sign(contract.id, signatureHash, req.ip || 'unknown');
  res.json(result);
});
