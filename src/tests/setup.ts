import { prisma } from '../lib/prisma';

beforeEach(async () => {
  await prisma.$transaction([
    prisma.application.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
