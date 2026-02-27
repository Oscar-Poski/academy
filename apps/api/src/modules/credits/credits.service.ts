import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreditEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreditsWalletDto } from './dto';

export type ApplyCreditEventInput = {
  userId: string;
  eventType: CreditEventType;
  amount: number;
  idempotencyKey: string;
  reason?: string | null;
};

@Injectable()
export class CreditsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getWallet(userId: string): Promise<CreditsWalletDto> {
    const normalizedUserId = await this.assertKnownUser(userId);
    const wallet = await this.prisma.userCredit.findUnique({
      where: { userId: normalizedUserId },
      select: {
        balance: true,
        updatedAt: true
      }
    });

    return {
      userId: normalizedUserId,
      balance: wallet?.balance ?? 0,
      updatedAt: wallet?.updatedAt.toISOString() ?? null
    };
  }

  async applyCreditEvent(input: ApplyCreditEventInput): Promise<void> {
    const userId = await this.assertKnownUser(input.userId);
    const idempotencyKey = this.normalizeRequiredString(input.idempotencyKey, 'idempotencyKey');
    const amount = this.normalizeAmount(input.amount);

    await this.prisma.$transaction(async (tx) => {
      const existingEvent = await tx.creditEvent.findUnique({
        where: { idempotencyKey },
        select: { id: true }
      });

      if (existingEvent) {
        return;
      }

      const current = await tx.userCredit.findUnique({
        where: { userId },
        select: { balance: true }
      });

      const nextBalance = (current?.balance ?? 0) + amount;
      if (nextBalance < 0) {
        throw new BadRequestException('Insufficient credits');
      }

      await tx.creditEvent.create({
        data: {
          userId,
          eventType: input.eventType,
          amount,
          idempotencyKey,
          reason: input.reason ?? null
        }
      });

      await tx.userCredit.upsert({
        where: { userId },
        update: { balance: nextBalance },
        create: {
          userId,
          balance: nextBalance
        }
      });
    });
  }

  private async assertKnownUser(userId: string): Promise<string> {
    const normalizedUserId = this.normalizeRequiredString(userId, 'userId');
    const user = await this.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true }
    });

    if (!user) {
      throw new BadRequestException(`Unknown user: ${userId}`);
    }

    return normalizedUserId;
  }

  private normalizeRequiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private normalizeAmount(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value === 0) {
      throw new BadRequestException('amount must be a non-zero integer');
    }

    return value;
  }
}
