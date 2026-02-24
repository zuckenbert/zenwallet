import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';

export const dashboardRouter = Router();

// Dashboard overview stats
dashboardRouter.get('/stats', async (_req: Request, res: Response) => {
  const [
    totalLeads,
    leadsByStage,
    totalApplications,
    applicationsByStatus,
    approvedVolume,
    todayLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ['stage'], _count: true }),
    prisma.application.count(),
    prisma.application.groupBy({ by: ['status'], _count: true }),
    prisma.application.aggregate({
      where: { status: 'APPROVED' },
      _sum: { approvedAmount: true },
      _count: true,
    }),
    prisma.lead.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  const conversionRate = totalLeads > 0
    ? ((approvedVolume._count / totalLeads) * 100).toFixed(1)
    : '0.0';

  res.json({
    overview: {
      totalLeads,
      todayLeads,
      totalApplications,
      approvedCount: approvedVolume._count,
      approvedVolume: approvedVolume._sum.approvedAmount || 0,
      conversionRate: `${conversionRate}%`,
    },
    funnel: {
      stages: leadsByStage.map((s) => ({
        stage: s.stage,
        count: s._count,
      })),
    },
    applications: {
      byStatus: applicationsByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    },
  });
});

// Recent activity feed
dashboardRouter.get('/activity', async (req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

  const recentMessages = await prisma.message.findMany({
    include: {
      conversation: {
        include: { lead: { select: { name: true, phone: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const activity = recentMessages.map((msg) => ({
    id: msg.id,
    type: msg.role === 'USER' ? 'incoming_message' : 'outgoing_message',
    leadName: msg.conversation.lead.name || msg.conversation.lead.phone,
    content: msg.content.substring(0, 100),
    createdAt: msg.createdAt,
  }));

  res.json(activity);
});
