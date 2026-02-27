import { Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import type { UnlockDecisionDto } from './dto';
import { UnlocksService } from './unlocks.service';

@Controller('v1/unlocks')
export class UnlocksController {
  constructor(@Inject(UnlocksService) private readonly unlocksService: UnlocksService) {}

  @Get('modules/:moduleId/status')
  @UseGuards(BearerAuthGuard)
  getModuleStatus(
    @Param('moduleId') moduleId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<UnlockDecisionDto> {
    return this.unlocksService.getModuleStatus(request.user!.sub, moduleId);
  }

  @Post('modules/:moduleId/evaluate')
  @HttpCode(200)
  @UseGuards(BearerAuthGuard)
  evaluateModuleUnlock(
    @Param('moduleId') moduleId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<UnlockDecisionDto> {
    return this.unlocksService.evaluateModuleUnlock(request.user!.sub, moduleId);
  }
}
