import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IngestAnalyticsEventDto, IngestAnalyticsEventResponseDto } from './dto';

const ALLOWED_EVENT_NAMES = new Set([
  'section_start',
  'section_complete',
  'player_exit',
  'player_dropoff'
] as const);

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ingestEvent(body: IngestAnalyticsEventDto): Promise<IngestAnalyticsEventResponseDto> {
    const eventName = this.validateEventName(body?.event_name);
    const occurredAt = this.parseOccurredAt(body?.occurred_at);
    const idempotencyKey = this.normalizeIdempotencyKey(body?.idempotency_key);
    const payloadJson = this.normalizePayloadObject(body?.payload_json);

    try {
      const created = await this.prisma.analyticsEvent.create({
        data: {
          idempotencyKey,
          eventName,
          userId: this.normalizeNullableString(body.user_id),
          pathId: this.normalizeNullableString(body.path_id),
          moduleId: this.normalizeNullableString(body.module_id),
          sectionId: this.normalizeNullableString(body.section_id),
          sectionVersionId: this.normalizeNullableString(body.section_version_id),
          payloadJson,
          occurredAt
        },
        select: { id: true }
      });

      return { id: created.id };
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.analyticsEvent.findUnique({
          where: { idempotencyKey },
          select: { id: true }
        });

        if (existing) {
          return { id: existing.id };
        }
      }

      throw error;
    }
  }

  private validateEventName(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException('event_name is required');
    }

    const trimmed = value.trim();
    if (!ALLOWED_EVENT_NAMES.has(trimmed as (typeof ALLOWED_EVENT_NAMES extends Set<infer T> ? T : never))) {
      throw new BadRequestException('event_name is not supported');
    }

    return trimmed;
  }

  private parseOccurredAt(value: unknown): Date {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException('occurred_at is required');
    }

    const occurredAt = new Date(value);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurred_at must be a valid ISO timestamp');
    }

    return occurredAt;
  }

  private normalizeIdempotencyKey(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('idempotency_key must be a string when provided');
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('idempotency_key must not be empty');
    }

    return trimmed;
  }

  private normalizeNullableString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizePayloadObject(value: unknown): Prisma.InputJsonObject {
    if (value == null) {
      return {};
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('payload_json must be an object when provided');
    }

    return value as Prisma.InputJsonObject;
  }
}
