import { Controller, Get, Headers, Inject, Req, UseGuards } from '@nestjs/common';
import { OptionalBearerAuthGuard } from '../auth/optional-bearer-auth.guard';
import { resolveUserIdFromRequest } from '../auth/resolve-user-id';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { GamificationSummaryDto } from './dto';
import { GamificationService } from './gamification.service';

@Controller('v1/gamification')
export class GamificationController {
  constructor(@Inject(GamificationService) private readonly gamificationService: GamificationService) {}

  @Get('me')
  @UseGuards(OptionalBearerAuthGuard)
  getSummary(
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<GamificationSummaryDto> {
    return this.gamificationService.getSummary(resolveUserIdFromRequest(request, userId) ?? '');
  }
}
