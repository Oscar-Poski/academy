import { Body, Controller, Inject, Post } from '@nestjs/common';
import type { IngestAnalyticsEventDto, IngestAnalyticsEventResponseDto } from './dto';
import { AnalyticsService } from './analytics.service';

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  ingestEvent(@Body() body: IngestAnalyticsEventDto): Promise<IngestAnalyticsEventResponseDto> {
    return this.analyticsService.ingestEvent(body);
  }
}
