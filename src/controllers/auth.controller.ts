import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
} from '../utils/jwt';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  const hashedRefreshToken = await hashToken(refreshToken);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedRefreshToken } });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.status(201).json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  const hashedRefreshToken = await hashToken(refreshToken);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedRefreshToken } });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.refreshToken) {
    res.status(401).json({ error: 'Refresh token revoked' });
    return;
  }

  const valid = await compareToken(token, user.refreshToken);
  if (!valid) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  const newAccessToken = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);
  const hashed = await hashToken(newRefreshToken);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashed } });

  res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
  res.json({ accessToken: newAccessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, avatar: true, provider: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  const hashed = await hashToken(refreshToken);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashed } });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.redirect(`${env.clientUrl}/login?token=${accessToken}`);
});
