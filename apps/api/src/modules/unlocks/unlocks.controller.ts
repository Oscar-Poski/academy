import { Controller, Get, Headers, Inject, Param } from '@nestjs/common';
import type { UnlockDecisionDto } from './dto';
import { UnlocksService } from './unlocks.service';

@Controller('v1/unlocks')
export class UnlocksController {
  constructor(@Inject(UnlocksService) private readonly unlocksService: UnlocksService) {}

  @Get('modules/:moduleId/status')
  getModuleStatus(
    @Param('moduleId') moduleId: string,
    @Headers('x-user-id') userId: string
  ): Promise<UnlockDecisionDto> {
    return this.unlocksService.getModuleStatus(userId, moduleId);
  }
}
