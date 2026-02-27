import { Body, Controller, Get, Headers, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OptionalBearerAuthGuard } from '../auth/optional-bearer-auth.guard';
import { resolveUserIdFromRequest } from '../auth/resolve-user-id';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type {
  QuizAttemptResultDto,
  QuizLatestAttemptDto,
  QuizResultDto,
  QuizSubmissionDto
} from './dto';
import { QuizService } from './quiz.service';

@Controller('v1/quizzes')
export class QuizController {
  constructor(@Inject(QuizService) private readonly quizService: QuizService) {}

  @Post('sections/:sectionId/attempts')
  @UseGuards(OptionalBearerAuthGuard)
  submitAttempt(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: QuizSubmissionDto,
    @Req() request: AuthenticatedRequest
  ): Promise<QuizAttemptResultDto> {
    return this.quizService.submitAttempt(resolveUserIdFromRequest(request, userId) ?? '', sectionId, body);
  }

  @Get('sections/:sectionId/attempts/latest')
  @UseGuards(OptionalBearerAuthGuard)
  getLatestAttempt(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<QuizLatestAttemptDto> {
    return this.quizService.getLatestAttempt(resolveUserIdFromRequest(request, userId) ?? '', sectionId);
  }

  @Get('sections/:sectionId/result')
  @UseGuards(OptionalBearerAuthGuard)
  getResult(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<QuizResultDto> {
    return this.quizService.getResult(resolveUserIdFromRequest(request, userId) ?? '', sectionId);
  }
}
