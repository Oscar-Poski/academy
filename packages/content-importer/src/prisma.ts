import { PrismaClient } from '@prisma/client';

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export async function withPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = createPrismaClient();

  await prisma.$connect();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

