import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const [total, thisWeek, thisMonth, interviews, offers, followUpsNeeded] = await Promise.all([
    prisma.application.count({ where: { userId } }),
    prisma.application.count({ where: { userId, dateApplied: { gte: startOfWeek } } }),
    prisma.application.count({ where: { userId, dateApplied: { gte: startOfMonth } } }),
    prisma.application.count({
      where: { userId, status: { in: ['INTERVIEW_SCHEDULED', 'INTERVIEW_DONE'] } },
    }),
    prisma.application.count({ where: { userId, status: 'OFFER_RECEIVED' } }),
    prisma.application.count({
      where: { userId, status: 'APPLIED', dateApplied: { lte: sevenDaysAgo }, followUpSent: false },
    }),
  ]);

  res.json({ totalApplications: total, thisWeek, thisMonth, interviews, offers, followUpsNeeded });
});

export const getByStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const grouped = await prisma.application.groupBy({
    by: ['status'],
    where: { userId },
    _count: { status: true },
  });
  const data = grouped.map((g) => ({ status: g.status, count: g._count.status }));
  res.json({ data });
});

export const getTimeline = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const applications = await prisma.application.findMany({
    where: { userId, dateApplied: { gte: thirtyDaysAgo } },
    select: { dateApplied: true },
    orderBy: { dateApplied: 'asc' },
  });

  const counts: Record<string, number> = {};
  for (const app of applications) {
    const date = app.dateApplied.toISOString().slice(0, 10);
    counts[date] = (counts[date] || 0) + 1;
  }

  const data = Object.entries(counts).map(([date, count]) => ({ date, count }));
  res.json({ data });
});

export const getResponseRate = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const [total, responded] = await Promise.all([
    prisma.application.count({ where: { userId } }),
    prisma.application.count({
      where: {
        userId,
        status: { in: ['INTERVIEW_SCHEDULED', 'INTERVIEW_DONE', 'OFFER_RECEIVED'] },
      },
    }),
  ]);
  const rate = total > 0 ? Math.round((responded / total) * 100) : 0;
  res.json({ rate, total, responded });
});
