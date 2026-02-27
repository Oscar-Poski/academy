import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import type { GamificationSummaryDto } from './dto';
import { GamificationService } from './gamification.service';

@Controller('v1/gamification')
export class GamificationController {
  constructor(@Inject(GamificationService) private readonly gamificationService: GamificationService) {}

  @Get('me')
  @UseGuards(BearerAuthGuard)
  getSummary(@Req() request: AuthenticatedRequest): Promise<GamificationSummaryDto> {
    return this.gamificationService.getSummary(request.user!.sub);
  }
}
