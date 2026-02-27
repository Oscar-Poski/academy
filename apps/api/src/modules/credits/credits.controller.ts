import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import type { CreditsWalletDto } from './dto';
import { CreditsService } from './credits.service';

@Controller('v1/credits')
export class CreditsController {
  constructor(@Inject(CreditsService) private readonly creditsService: CreditsService) {}

  @Get('me')
  @UseGuards(BearerAuthGuard)
  getWallet(@Req() request: AuthenticatedRequest): Promise<CreditsWalletDto> {
    return this.creditsService.getWallet(request.user!.sub);
  }
}
