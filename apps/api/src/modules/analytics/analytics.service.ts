import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IngestAnalyticsEventDto, IngestAnalyticsEventResponseDto } from './dto';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ingestEvent(body: IngestAnalyticsEventDto): Promise<IngestAnalyticsEventResponseDto> {
    const eventName =
      typeof body?.event_name === 'string' && body.event_name.trim().length > 0
        ? body.event_name.trim()
        : null;

    if (!eventName) {
      throw new BadRequestException('event_name is required');
    }

    if (typeof body?.occurred_at !== 'string' || body.occurred_at.trim().length === 0) {
      throw new BadRequestException('occurred_at is required');
    }

    const occurredAt = new Date(body.occurred_at);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurred_at must be a valid ISO timestamp');
    }

    const created = await this.prisma.analyticsEvent.create({
      data: {
        eventName,
        userId: this.normalizeNullableString(body.user_id),
        pathId: this.normalizeNullableString(body.path_id),
        moduleId: this.normalizeNullableString(body.module_id),
        sectionId: this.normalizeNullableString(body.section_id),
        sectionVersionId: this.normalizeNullableString(body.section_version_id),
        payloadJson: body.payload_json ?? {},
        occurredAt
      },
      select: { id: true }
    });

    return { id: created.id };
  }

  private normalizeNullableString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
