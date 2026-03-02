import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BearerAuthGuard } from './bearer-auth.guard';
import type {
  AuthMeDto,
  LoginRequestDto,
  LoginResponseDto,
  LogoutRequestDto,
  LogoutResponseDto,
  RefreshRequestDto,
  RegisterRequestDto
} from './dto';
import type { AuthenticatedRequest } from './auth.types';

@Controller('v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }

  @Post('register')
  @HttpCode(201)
  register(@Body() body: RegisterRequestDto): Promise<LoginResponseDto> {
    return this.authService.register(body);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshRequestDto): Promise<LoginResponseDto> {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() body: LogoutRequestDto): Promise<LogoutResponseDto> {
    return this.authService.logout(body);
  }

  @Get('me')
  @UseGuards(BearerAuthGuard)
  getMe(@Req() request: AuthenticatedRequest): Promise<AuthMeDto> {
    return this.authService.getMe(request.user!.sub);
  }
}
