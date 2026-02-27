import { Controller, Get, Headers, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OptionalBearerAuthGuard } from '../auth/optional-bearer-auth.guard';
import { resolveUserIdFromRequest } from '../auth/resolve-user-id';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { UnlockDecisionDto } from './dto';
import { UnlocksService } from './unlocks.service';

@Controller('v1/unlocks')
export class UnlocksController {
  constructor(@Inject(UnlocksService) private readonly unlocksService: UnlocksService) {}

  @Get('modules/:moduleId/status')
  @UseGuards(OptionalBearerAuthGuard)
  getModuleStatus(
    @Param('moduleId') moduleId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<UnlockDecisionDto> {
    return this.unlocksService.getModuleStatus(resolveUserIdFromRequest(request, userId) ?? '', moduleId);
  }

  @Post('modules/:moduleId/evaluate')
  @HttpCode(200)
  @UseGuards(OptionalBearerAuthGuard)
  evaluateModuleUnlock(
    @Param('moduleId') moduleId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<UnlockDecisionDto> {
    return this.unlocksService.evaluateModuleUnlock(resolveUserIdFromRequest(request, userId) ?? '', moduleId);
  }
}
