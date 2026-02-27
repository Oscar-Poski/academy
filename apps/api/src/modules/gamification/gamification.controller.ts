import { Controller, Get, Headers, Inject } from '@nestjs/common';
import type { GamificationSummaryDto } from './dto';
import { GamificationService } from './gamification.service';

@Controller('v1/gamification')
export class GamificationController {
  constructor(@Inject(GamificationService) private readonly gamificationService: GamificationService) {}

  @Get('me')
  getSummary(@Headers('x-user-id') userId: string): Promise<GamificationSummaryDto> {
    return this.gamificationService.getSummary(userId);
  }
}
