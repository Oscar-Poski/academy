import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BearerAuthGuard } from './bearer-auth.guard';
import type { AuthMeDto, LoginRequestDto, LoginResponseDto } from './dto';
import type { AuthenticatedRequest } from './auth.types';

@Controller('v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(BearerAuthGuard)
  getMe(@Req() request: AuthenticatedRequest): Promise<AuthMeDto> {
    return this.authService.getMe(request.user!.sub);
  }
}
