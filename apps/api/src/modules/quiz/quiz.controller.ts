import { Body, Controller, Headers, Inject, Param, Post } from '@nestjs/common';
import type { QuizAttemptResultDto, QuizSubmissionDto } from './dto';
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
}
