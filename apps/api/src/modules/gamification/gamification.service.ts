import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma, XpEventType, XpSourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { GamificationSummaryDto } from './dto';

type AwardXpEventInput = {
  userId: string;
  eventType: XpEventType;
  sourceType: XpSourceType;
  sourceId: string;
  xpDelta: number;
  idempotencyKey: string;
};

const DEFAULT_XP_SECTION_COMPLETE = 50;
const DEFAULT_XP_QUIZ_PASS = 100;

@Injectable()
export class GamificationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<GamificationSummaryDto> {
    const normalizedUserId = await this.assertKnownUser(userId);
    const level = await this.prisma.userLevel.findUnique({
      where: { userId: normalizedUserId },
      select: {
        totalXp: true,
        level: true
      }
    });

    return {
      userId: normalizedUserId,
      totalXp: level?.totalXp ?? 0,
      level: level?.level ?? 1
    };
  }

  async awardSectionCompleteXp(
    userId: string,
    sectionId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    await this.awardXpEvent(
      {
        userId,
        eventType: XpEventType.section_complete,
        sourceType: XpSourceType.section,
        sourceId: sectionId,
        xpDelta: this.getSectionCompleteXpValue(),
        idempotencyKey: `section_complete:${userId}:${sectionId}`
      },
      tx
    );
  }

  async awardQuizPassXp(
    userId: string,
    sectionId: string,
    attemptId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    await this.awardXpEvent(
      {
        userId,
        eventType: XpEventType.quiz_pass,
        sourceType: XpSourceType.quiz_attempt,
        sourceId: attemptId,
        xpDelta: this.getQuizPassXpValue(),
        idempotencyKey: `quiz_pass:${userId}:${sectionId}`
      },
      tx
    );
  }

  private async awardXpEvent(input: AwardXpEventInput, tx?: Prisma.TransactionClient): Promise<void> {
    if (input.xpDelta <= 0) {
      return;
    }

    try {
      if (tx) {
        const existing = await tx.xpEvent.findUnique({
          where: {
            idempotencyKey: input.idempotencyKey
          },
          select: {
            id: true
          }
        });
        if (existing) {
          return;
        }

        await this.insertXpEventAndUpdateLevel(tx, input);
        return;
      }

      await this.prisma.$transaction(async (transaction) => {
        await this.insertXpEventAndUpdateLevel(transaction, input);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }
  }

  private async insertXpEventAndUpdateLevel(
    tx: Prisma.TransactionClient,
    input: AwardXpEventInput
  ): Promise<void> {
    await tx.xpEvent.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        xpDelta: input.xpDelta,
        idempotencyKey: input.idempotencyKey
      }
    });

    const existing = await tx.userLevel.findUnique({
      where: { userId: input.userId },
      select: {
        totalXp: true
      }
    });

    const nextTotalXp = (existing?.totalXp ?? 0) + input.xpDelta;
    const nextLevel = this.computeLevel(nextTotalXp);

    await tx.userLevel.upsert({
      where: { userId: input.userId },
      update: {
        totalXp: nextTotalXp,
        level: nextLevel
      },
      create: {
        userId: input.userId,
        totalXp: nextTotalXp,
        level: nextLevel
      }
    });
  }

  private async assertKnownUser(userId: string): Promise<string> {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('user id is required');
    }

    const normalizedUserId = userId.trim();
    const user = await this.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true }
    });

    if (!user) {
      throw new BadRequestException(`Unknown user: ${userId}`);
    }

    return normalizedUserId;
  }

  private computeLevel(totalXp: number): number {
    return Math.max(1, Math.floor(totalXp / 100) + 1);
  }

  private getSectionCompleteXpValue(): number {
    return this.getNumericEnv('XP_SECTION_COMPLETE', DEFAULT_XP_SECTION_COMPLETE);
  }

  private getQuizPassXpValue(): number {
    return this.getNumericEnv('XP_QUIZ_PASS', DEFAULT_XP_QUIZ_PASS);
  }

  private getNumericEnv(name: string, fallback: number): number {
    const rawValue = process.env[name];
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
