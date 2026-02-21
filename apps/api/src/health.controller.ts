import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('/health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown database error';
      return { status: 'ok', db: 'error', reason };
    }
  }
}
