import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
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
  @UseGuards(BearerAuthGuard)
  submitAttempt(
    @Param('sectionId') sectionId: string,
    @Body() body: QuizSubmissionDto,
    @Req() request: AuthenticatedRequest
  ): Promise<QuizAttemptResultDto> {
    return this.quizService.submitAttempt(request.user!.sub, sectionId, body);
  }

  @Get('sections/:sectionId/attempts/latest')
  @UseGuards(BearerAuthGuard)
  getLatestAttempt(
    @Param('sectionId') sectionId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<QuizLatestAttemptDto> {
    return this.quizService.getLatestAttempt(request.user!.sub, sectionId);
  }

  @Get('sections/:sectionId/result')
  @UseGuards(BearerAuthGuard)
  getResult(
    @Param('sectionId') sectionId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<QuizResultDto> {
    return this.quizService.getResult(request.user!.sub, sectionId);
  }
}
