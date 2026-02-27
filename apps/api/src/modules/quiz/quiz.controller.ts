import { Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
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
  submitAttempt(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: QuizSubmissionDto
  ): Promise<QuizAttemptResultDto> {
    return this.quizService.submitAttempt(userId, sectionId, body);
  }

  @Get('sections/:sectionId/attempts/latest')
  getLatestAttempt(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string
  ): Promise<QuizLatestAttemptDto> {
    return this.quizService.getLatestAttempt(userId, sectionId);
  }

  @Get('sections/:sectionId/result')
  getResult(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string
  ): Promise<QuizResultDto> {
    return this.quizService.getResult(userId, sectionId);
  }
}
