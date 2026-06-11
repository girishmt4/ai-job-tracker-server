import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ApplicationStatus, WorkModel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    status,
    workModel,
    search,
    sortBy = 'dateApplied',
    sortOrder = 'desc',
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where = {
    userId,
    ...(status && { status: status as ApplicationStatus }),
    ...(workModel && { workModel: workModel as WorkModel }),
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: 'insensitive' as const } },
        { jobTitle: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const validSortFields = ['dateApplied', 'updatedAt', 'companyName'] as const;
  const sortField = validSortFields.includes(sortBy as typeof validSortFields[number])
    ? sortBy
    : 'dateApplied';

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { [sortField]: sortOrder === 'asc' ? 'asc' : 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.application.count({ where }),
  ]);

  res.json({
    applications,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  if (application.userId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  res.json({ application });
});

export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const {
    companyName,
    jobTitle,
    location,
    workModel,
    status,
    dateApplied,
    jobUrl,
    notes,
    salaryExpected,
    contactPerson,
  } = req.body as {
    companyName: string;
    jobTitle: string;
    location?: string;
    workModel?: WorkModel;
    status?: ApplicationStatus;
    dateApplied?: string;
    jobUrl?: string;
    notes?: string;
    salaryExpected?: string;
    contactPerson?: string;
  };

  const application = await prisma.application.create({
    data: {
      userId: req.user!.id,
      companyName,
      jobTitle,
      location,
      workModel: workModel || 'HYBRID',
      status: status || 'APPLIED',
      dateApplied: dateApplied ? new Date(dateApplied) : new Date(),
      jobUrl,
      notes,
      salaryExpected,
      contactPerson,
    },
  });

  res.status(201).json({ application });
});

export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  if (existing.userId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const {
    companyName,
    jobTitle,
    location,
    workModel,
    status,
    dateApplied,
    jobUrl,
    notes,
    salaryExpected,
    contactPerson,
    followUpSent,
    followUpDate,
  } = req.body as Partial<{
    companyName: string;
    jobTitle: string;
    location: string;
    workModel: WorkModel;
    status: ApplicationStatus;
    dateApplied: string;
    jobUrl: string;
    notes: string;
    salaryExpected: string;
    contactPerson: string;
    followUpSent: boolean;
    followUpDate: string;
  }>;

  const application = await prisma.application.update({
    where: { id },
    data: {
      ...(companyName !== undefined && { companyName }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(location !== undefined && { location }),
      ...(workModel !== undefined && { workModel }),
      ...(status !== undefined && { status }),
      ...(dateApplied !== undefined && { dateApplied: new Date(dateApplied) }),
      ...(jobUrl !== undefined && { jobUrl }),
      ...(notes !== undefined && { notes }),
      ...(salaryExpected !== undefined && { salaryExpected }),
      ...(contactPerson !== undefined && { contactPerson }),
      ...(followUpSent !== undefined && { followUpSent }),
      ...(followUpDate !== undefined && { followUpDate: new Date(followUpDate) }),
    },
  });

  res.json({ application });
});

export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  if (existing.userId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  await prisma.application.delete({ where: { id } });
  res.json({ message: 'Deleted' });
});

export const getFollowUps = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const applications = await prisma.application.findMany({
    where: {
      userId,
      status: 'APPLIED',
      dateApplied: { lte: sevenDaysAgo },
      followUpSent: false,
    },
    orderBy: { dateApplied: 'asc' },
    select: { id: true, companyName: true, jobTitle: true, dateApplied: true },
  });

  const followUps = applications.map((app) => ({
    ...app,
    daysSinceApplied: Math.floor(
      (Date.now() - app.dateApplied.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  res.json({ followUps, count: followUps.length });
});

export const markFollowUpSent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  if (existing.userId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const application = await prisma.application.update({
    where: { id },
    data: { followUpSent: true, followUpDate: new Date() },
  });
  res.json({ application });
});
