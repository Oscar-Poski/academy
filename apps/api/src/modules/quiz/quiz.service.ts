import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { QuestionType, SectionVersionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { QuizAttemptResultDto, QuizSubmissionDto } from './dto';

@Injectable()
export class QuizService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async submitAttempt(
    userId: string,
    sectionId: string,
    body: QuizSubmissionDto
  ): Promise<QuizAttemptResultDto> {
    await this.assertKnownUser(userId);
    const normalizedAnswers = this.normalizeSubmissionBody(body);
    const sectionVersionId = await this.resolveSectionVersionId(sectionId, userId);
    const mcqQuestions = await this.getMcqQuestions(sectionVersionId);

    if (mcqQuestions.length === 0) {
      throw new BadRequestException('No MCQ questions available for this section version');
    }

    const questionIds = new Set(mcqQuestions.map((question) => question.id));
    for (const questionId of normalizedAnswers.keys()) {
      if (!questionIds.has(questionId)) {
        throw new BadRequestException(`question_id ${questionId} is not part of this section quiz`);
      }
    }

    let score = 0;
    let maxScore = 0;
    const attemptAnswers: Array<{
      questionId: string;
      answerJson: { selected_option: string | null };
      isCorrect: boolean;
      awardedPoints: number;
    }> = [];
    const feedback: QuizAttemptResultDto['feedback'] = [];

    for (const question of mcqQuestions) {
      const expectedOption = this.getExpectedOption(question.answerKeyJson, question.id);
      const selectedOption = normalizedAnswers.get(question.id) ?? null;
      const isCorrect = selectedOption !== null && selectedOption.trim() === expectedOption.trim();
      const awardedPoints = isCorrect ? question.points : 0;

      score += awardedPoints;
      maxScore += question.points;

      attemptAnswers.push({
        questionId: question.id,
        answerJson: { selected_option: selectedOption },
        isCorrect,
        awardedPoints
      });

      feedback.push({
        questionId: question.id,
        isCorrect,
        awardedPoints,
        expectedOption,
        selectedOption,
        explanation: question.explanation
      });
    }

    if (maxScore === 0) {
      throw new BadRequestException('No MCQ questions available for this section version');
    }

    const passed = score / maxScore >= 0.7;

    const result = await this.prisma.$transaction(async (tx) => {
      const lastAttempt = await tx.quizAttempt.findFirst({
        where: {
          userId,
          sectionId
        },
        orderBy: [{ attemptNo: 'desc' }],
        select: {
          attemptNo: true
        }
      });

      const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
      const gradingDetailsJson = {
        feedback
      };

      const attempt = await tx.quizAttempt.create({
        data: {
          userId,
          sectionId,
          sectionVersionId,
          attemptNo,
          score,
          maxScore,
          passed,
          gradingDetailsJson
        },
        select: {
          id: true,
          userId: true,
          sectionId: true,
          sectionVersionId: true,
          attemptNo: true,
          score: true,
          maxScore: true,
          passed: true,
          submittedAt: true
        }
      });

      await tx.quizAttemptAnswer.createMany({
        data: attemptAnswers.map((answer) => ({
          attemptId: attempt.id,
          questionId: answer.questionId,
          answerJson: answer.answerJson,
          isCorrect: answer.isCorrect,
          awardedPoints: answer.awardedPoints
        }))
      });

      return attempt;
    });

    return {
      attemptId: result.id,
      userId: result.userId,
      sectionId: result.sectionId,
      sectionVersionId: result.sectionVersionId,
      attemptNo: result.attemptNo,
      score: result.score,
      maxScore: result.maxScore,
      passed: result.passed,
      submittedAt: result.submittedAt.toISOString(),
      feedback
    };
  }

  private async assertKnownUser(userId: string): Promise<void> {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('x-user-id header is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId.trim() },
      select: { id: true }
    });

    if (!user) {
      throw new BadRequestException(`Unknown user: ${userId}`);
    }
  }

  private normalizeSubmissionBody(body: QuizSubmissionDto): Map<string, string> {
    if (!body || !Array.isArray(body.answers)) {
      throw new BadRequestException('answers must be an array');
    }

    const normalized = new Map<string, string>();
    for (const answer of body.answers) {
      if (!answer || typeof answer !== 'object') {
        throw new BadRequestException('each answer must be an object');
      }

      const questionId = typeof answer.question_id === 'string' ? answer.question_id.trim() : '';
      const selectedOption =
        typeof answer.selected_option === 'string' ? answer.selected_option.trim() : '';

      if (questionId.length === 0 || selectedOption.length === 0) {
        throw new BadRequestException('each answer must include question_id and selected_option');
      }

      if (normalized.has(questionId)) {
        throw new BadRequestException(`duplicate question_id in answers: ${questionId}`);
      }

      normalized.set(questionId, selectedOption);
    }

    return normalized;
  }

  private async resolveSectionVersionId(sectionId: string, userId: string): Promise<string> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true }
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    const progress = await this.prisma.userSectionProgress.findUnique({
      where: {
        userId_sectionId: {
          userId: userId.trim(),
          sectionId
        }
      },
      select: {
        sectionVersionId: true
      }
    });

    if (progress) {
      const pinned = await this.prisma.sectionVersion.findFirst({
        where: {
          id: progress.sectionVersionId,
          sectionId,
          status: {
            in: [SectionVersionStatus.published, SectionVersionStatus.archived]
          }
        },
        select: { id: true }
      });

      if (pinned) {
        return pinned.id;
      }
    }

    const latestPublished = await this.prisma.sectionVersion.findFirst({
      where: {
        sectionId,
        status: SectionVersionStatus.published
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      select: { id: true }
    });

    if (!latestPublished) {
      throw new NotFoundException(`Section ${sectionId} has no published version`);
    }

    return latestPublished.id;
  }

  private async getMcqQuestions(sectionVersionId: string) {
    return this.prisma.question.findMany({
      where: {
        sectionVersionId,
        type: QuestionType.mcq
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        answerKeyJson: true,
        explanation: true,
        points: true
      }
    });
  }

  private getExpectedOption(answerKeyJson: unknown, questionId: string): string {
    if (!answerKeyJson || typeof answerKeyJson !== 'object' || Array.isArray(answerKeyJson)) {
      throw new InternalServerErrorException(
        `Invalid answer key configuration for question ${questionId}`
      );
    }

    const value = (answerKeyJson as { correct_option?: unknown }).correct_option;
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new InternalServerErrorException(
        `Invalid answer key configuration for question ${questionId}`
      );
    }

    return value;
  }
}
