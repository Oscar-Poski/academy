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
    const userId = this.normalizeNullableString(body.user_id);
    const pathId = this.normalizeNullableString(body.path_id);
    const moduleId = this.normalizeNullableString(body.module_id);
    const sectionId = this.normalizeNullableString(body.section_id);
    const sectionVersionId = this.normalizeNullableString(body.section_version_id);

    this.validateEventContract({
      eventName,
      userId,
      pathId,
      moduleId,
      sectionId,
      sectionVersionId,
      payloadJson
    });

    try {
      const created = await this.prisma.analyticsEvent.create({
        data: {
          idempotencyKey,
          eventName,
          userId,
          pathId,
          moduleId,
          sectionId,
          sectionVersionId,
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

  private validateEventContract(input: {
    eventName: string;
    userId: string | null;
    pathId: string | null;
    moduleId: string | null;
    sectionId: string | null;
    sectionVersionId: string | null;
    payloadJson: Prisma.InputJsonObject;
  }): void {
    const details: string[] = [];
    if (!input.userId) {
      details.push('user_id is required');
    }
    if (!input.pathId) {
      details.push('path_id is required');
    }
    if (!input.moduleId) {
      details.push('module_id is required');
    }
    if (!input.sectionId) {
      details.push('section_id is required');
    }
    if (!input.sectionVersionId) {
      details.push('section_version_id is required');
    }

    if (input.eventName === 'player_exit' || input.eventName === 'player_dropoff') {
      const source = input.payloadJson.source;
      if (typeof source !== 'string' || source.trim().length === 0) {
        details.push('payload_json.source is required');
      }

      const dwellMs = input.payloadJson.dwell_ms;
      if (typeof dwellMs !== 'number' || !Number.isFinite(dwellMs) || dwellMs < 0) {
        details.push('payload_json.dwell_ms must be a number >= 0');
      }

      const completed = input.payloadJson.completed;
      if (typeof completed !== 'boolean') {
        details.push('payload_json.completed must be a boolean');
      }
    }

    if (details.length > 0) {
      throw new BadRequestException({
        code: 'invalid_analytics_payload',
        message: 'Analytics payload failed validation',
        details
      });
    }
  }
}
