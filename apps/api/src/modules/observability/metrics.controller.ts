import { Controller, Get, Inject } from '@nestjs/common';
import type { MetricsSnapshot } from './observability.types';
import { ObservabilityService } from './observability.service';

@Controller()
export class MetricsController {
  constructor(@Inject(ObservabilityService) private readonly observability: ObservabilityService) {}

  @Get('/metrics')
  metrics(): MetricsSnapshot {
    return this.observability.snapshot();
  }
}
