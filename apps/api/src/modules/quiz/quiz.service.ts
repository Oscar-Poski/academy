import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { QuestionType, SectionVersionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import type {
  QuizAttemptResultDto,
  QuizLatestAttemptDto,
  QuizResultDto,
  QuizSubmissionDto
} from './dto';

type ScorableQuestion = {
  id: string;
  type: QuestionType;
  answerKeyJson: unknown;
  explanation: string | null;
  points: number;
};

type SubmissionAnswer = {
  selectedOption: string | null;
  answerText: string | null;
};

type GradedAnswer = {
  questionId: string;
  questionType: 'mcq' | 'short_answer';
  isCorrect: boolean;
  awardedPoints: number;
  expectedOption: string | null;
  acceptedAnswers: string[] | null;
  expectedPattern: string | null;
  selectedOption: string | null;
  answerText: string | null;
  explanation: string | null;
};

@Injectable()
export class QuizService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GamificationService) private readonly gamificationService: GamificationService
  ) {}

  async submitAttempt(
    userId: string,
    sectionId: string,
    body: QuizSubmissionDto
  ): Promise<QuizAttemptResultDto> {
    await this.assertKnownUser(userId);
    await this.assertSectionExists(sectionId);

    const normalizedAnswers = this.normalizeSubmissionBody(body);
    const sectionVersionId = await this.resolveSectionVersionId(sectionId, userId);
    const questions = await this.getScorableQuestions(sectionVersionId);

    if (questions.length === 0) {
      throw new BadRequestException('No scorable questions available for this section version');
    }

    const questionIds = new Set(questions.map((question) => question.id));
    for (const questionId of normalizedAnswers.keys()) {
      if (!questionIds.has(questionId)) {
        throw new BadRequestException(`question_id ${questionId} is not part of this section quiz`);
      }
    }

    let score = 0;
    let maxScore = 0;
    const gradedAnswers: GradedAnswer[] = [];
    const persistedAnswers: Array<{
      questionId: string;
      answerJson: { selected_option?: string | null; answer_text?: string | null };
      isCorrect: boolean;
      awardedPoints: number;
    }> = [];

    for (const question of questions) {
      const submitted = normalizedAnswers.get(question.id) ?? {
        selectedOption: null,
        answerText: null
      };

      const graded =
        question.type === QuestionType.mcq
          ? this.gradeMcqQuestion(question, submitted)
          : this.gradeShortAnswerQuestion(question, submitted);

      score += graded.awardedPoints;
      maxScore += question.points;
      gradedAnswers.push(graded);

      persistedAnswers.push({
        questionId: question.id,
        answerJson:
          question.type === QuestionType.mcq
            ? { selected_option: graded.selectedOption }
            : { answer_text: graded.answerText },
        isCorrect: graded.isCorrect,
        awardedPoints: graded.awardedPoints
      });
    }

    if (maxScore === 0) {
      throw new BadRequestException('No scorable questions available for this section version');
    }

    const passed = score / maxScore >= 0.7;

    const attempt = await this.prisma.$transaction(async (tx) => {
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

      const createdAttempt = await tx.quizAttempt.create({
        data: {
          userId,
          sectionId,
          sectionVersionId,
          attemptNo,
          score,
          maxScore,
          passed,
          gradingDetailsJson: {
            feedback: gradedAnswers
          }
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
        data: persistedAnswers.map((answer) => ({
          attemptId: createdAttempt.id,
          questionId: answer.questionId,
          answerJson: answer.answerJson,
          isCorrect: answer.isCorrect,
          awardedPoints: answer.awardedPoints
        }))
      });

      if (createdAttempt.passed) {
        await this.gamificationService.awardQuizPassXp(userId, sectionId, createdAttempt.id, tx);
      }

      return createdAttempt;
    });

    return {
      attemptId: attempt.id,
      userId: attempt.userId,
      sectionId: attempt.sectionId,
      sectionVersionId: attempt.sectionVersionId,
      attemptNo: attempt.attemptNo,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt.toISOString(),
      feedback: gradedAnswers
    };
  }

  async getLatestAttempt(userId: string, sectionId: string): Promise<QuizLatestAttemptDto> {
    await this.assertKnownUser(userId);
    await this.assertSectionExists(sectionId);

    const attempt = await this.prisma.quizAttempt.findFirst({
      where: {
        userId: userId.trim(),
        sectionId
      },
      orderBy: [{ submittedAt: 'desc' }, { attemptNo: 'desc' }, { id: 'asc' }],
      select: {
        id: true
      }
    });

    if (!attempt) {
      throw new NotFoundException(`No attempts found for section ${sectionId}`);
    }

    return this.getAttemptDetailById(attempt.id);
  }

  async getResult(userId: string, sectionId: string): Promise<QuizResultDto> {
    await this.assertKnownUser(userId);
    await this.assertSectionExists(sectionId);

    const latest = await this.prisma.quizAttempt.findFirst({
      where: {
        userId: userId.trim(),
        sectionId
      },
      orderBy: [{ submittedAt: 'desc' }, { attemptNo: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        attemptNo: true,
        sectionVersionId: true,
        score: true,
        maxScore: true,
        passed: true,
        submittedAt: true
      }
    });

    if (!latest) {
      return {
        sectionId,
        hasAttempt: false,
        latestAttempt: null
      };
    }

    return {
      sectionId,
      hasAttempt: true,
      latestAttempt: {
        attemptId: latest.id,
        attemptNo: latest.attemptNo,
        sectionVersionId: latest.sectionVersionId,
        score: latest.score,
        maxScore: latest.maxScore,
        passed: latest.passed,
        submittedAt: latest.submittedAt.toISOString()
      }
    };
  }

  private async getAttemptDetailById(attemptId: string): Promise<QuizAttemptResultDto> {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        sectionId: true,
        sectionVersionId: true,
        attemptNo: true,
        score: true,
        maxScore: true,
        passed: true,
        submittedAt: true,
        answers: {
          select: {
            questionId: true,
            answerJson: true,
            isCorrect: true,
            awardedPoints: true,
            question: {
              select: {
                id: true,
                type: true,
                answerKeyJson: true,
                explanation: true,
                points: true
              }
            }
          }
        }
      }
    });

    if (!attempt) {
      throw new NotFoundException(`Quiz attempt ${attemptId} not found`);
    }

    const feedback: GradedAnswer[] = attempt.answers.map((answer) => {
      const question = answer.question;
      if (question.type === QuestionType.mcq) {
        const expectedOption = this.getExpectedOption(question.answerKeyJson, question.id);
        const selectedOption = this.getSelectedOptionFromJson(answer.answerJson);

        return {
          questionId: question.id,
          questionType: 'mcq',
          isCorrect: answer.isCorrect,
          awardedPoints: answer.awardedPoints,
          expectedOption,
          acceptedAnswers: null,
          expectedPattern: null,
          selectedOption,
          answerText: null,
          explanation: question.explanation
        };
      }

      const shortConfig = this.getShortAnswerConfig(question.answerKeyJson, question.id);
      const answerText = this.getAnswerTextFromJson(answer.answerJson);

      return {
        questionId: question.id,
        questionType: 'short_answer',
        isCorrect: answer.isCorrect,
        awardedPoints: answer.awardedPoints,
        expectedOption: null,
        acceptedAnswers: shortConfig.mode === 'regex' ? null : shortConfig.accepted,
        expectedPattern: shortConfig.mode === 'regex' ? shortConfig.pattern : null,
        selectedOption: null,
        answerText,
        explanation: question.explanation
      };
    });

    return {
      attemptId: attempt.id,
      userId: attempt.userId,
      sectionId: attempt.sectionId,
      sectionVersionId: attempt.sectionVersionId,
      attemptNo: attempt.attemptNo,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt.toISOString(),
      feedback
    };
  }

  private async assertKnownUser(userId: string): Promise<void> {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('user id is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId.trim() },
      select: { id: true }
    });

    if (!user) {
      throw new BadRequestException(`Unknown user: ${userId}`);
    }
  }

  private async assertSectionExists(sectionId: string): Promise<void> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true }
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }
  }

  private normalizeSubmissionBody(body: QuizSubmissionDto): Map<string, SubmissionAnswer> {
    if (!body || !Array.isArray(body.answers)) {
      throw new BadRequestException('answers must be an array');
    }

    const normalized = new Map<string, SubmissionAnswer>();
    for (const answer of body.answers) {
      if (!answer || typeof answer !== 'object') {
        throw new BadRequestException('each answer must be an object');
      }

      const questionId = typeof answer.question_id === 'string' ? answer.question_id.trim() : '';
      if (questionId.length === 0) {
        throw new BadRequestException('each answer must include question_id');
      }

      if (normalized.has(questionId)) {
        throw new BadRequestException(`duplicate question_id in answers: ${questionId}`);
      }

      const selectedOptionRaw =
        typeof answer.selected_option === 'string' ? answer.selected_option.trim() : '';
      const answerTextRaw = typeof answer.answer_text === 'string' ? answer.answer_text.trim() : '';

      const selectedOption = selectedOptionRaw.length > 0 ? selectedOptionRaw : null;
      const answerText = answerTextRaw.length > 0 ? answerTextRaw : null;

      if (selectedOption === null && answerText === null) {
        throw new BadRequestException(
          'each answer must include selected_option or answer_text when question_id is provided'
        );
      }

      normalized.set(questionId, { selectedOption, answerText });
    }

    return normalized;
  }

  private async resolveSectionVersionId(sectionId: string, userId: string): Promise<string> {
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

  private async getScorableQuestions(sectionVersionId: string): Promise<ScorableQuestion[]> {
    return this.prisma.question.findMany({
      where: {
        sectionVersionId,
        type: {
          in: [QuestionType.mcq, QuestionType.short_answer]
        }
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        answerKeyJson: true,
        explanation: true,
        points: true
      }
    });
  }

  private gradeMcqQuestion(question: ScorableQuestion, submitted: SubmissionAnswer): GradedAnswer {
    const expectedOption = this.getExpectedOption(question.answerKeyJson, question.id);
    const selectedOption = submitted.selectedOption;
    const isCorrect = selectedOption !== null && selectedOption.trim() === expectedOption.trim();

    return {
      questionId: question.id,
      questionType: 'mcq',
      isCorrect,
      awardedPoints: isCorrect ? question.points : 0,
      expectedOption,
      acceptedAnswers: null,
      expectedPattern: null,
      selectedOption,
      answerText: null,
      explanation: question.explanation
    };
  }

  private gradeShortAnswerQuestion(
    question: ScorableQuestion,
    submitted: SubmissionAnswer
  ): GradedAnswer {
    const config = this.getShortAnswerConfig(question.answerKeyJson, question.id);
    const answerText = submitted.answerText;

    let isCorrect = false;
    if (answerText !== null) {
      const normalizedInput = answerText.trim();
      if (config.mode === 'exact') {
        isCorrect = config.accepted.some((value) => normalizedInput === value);
      } else if (config.mode === 'exact_ci') {
        const lowered = normalizedInput.toLowerCase();
        isCorrect = config.accepted.some((value) => lowered === value.toLowerCase());
      } else if (config.mode === 'regex') {
        const flags = config.flags ?? '';
        let regex: RegExp;
        try {
          regex = new RegExp(config.pattern, flags);
        } catch {
          throw new InternalServerErrorException(
            `Invalid answer key configuration for question ${question.id}`
          );
        }
        isCorrect = regex.test(normalizedInput);
      }
    }

    return {
      questionId: question.id,
      questionType: 'short_answer',
      isCorrect,
      awardedPoints: isCorrect ? question.points : 0,
      expectedOption: null,
      acceptedAnswers: config.mode === 'regex' ? null : config.accepted,
      expectedPattern: config.mode === 'regex' ? config.pattern : null,
      selectedOption: null,
      answerText,
      explanation: question.explanation
    };
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

  private getShortAnswerConfig(answerKeyJson: unknown, questionId: string):
    | { mode: 'exact' | 'exact_ci'; accepted: string[] }
    | { mode: 'regex'; pattern: string; flags?: string } {
    if (!answerKeyJson || typeof answerKeyJson !== 'object' || Array.isArray(answerKeyJson)) {
      throw new InternalServerErrorException(
        `Invalid answer key configuration for question ${questionId}`
      );
    }

    const mode = (answerKeyJson as { mode?: unknown }).mode;
    if (mode !== 'exact' && mode !== 'exact_ci' && mode !== 'regex') {
      throw new InternalServerErrorException(
        `Invalid answer key configuration for question ${questionId}`
      );
    }

    if (mode === 'exact' || mode === 'exact_ci') {
      const acceptedRaw = (answerKeyJson as { accepted?: unknown }).accepted;
      if (!Array.isArray(acceptedRaw)) {
        throw new InternalServerErrorException(
          `Invalid answer key configuration for question ${questionId}`
        );
      }

      const accepted = acceptedRaw
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0);

      if (accepted.length === 0) {
        throw new InternalServerErrorException(
          `Invalid answer key configuration for question ${questionId}`
        );
      }

      return { mode, accepted };
    }

    const pattern = (answerKeyJson as { pattern?: unknown }).pattern;
    if (typeof pattern !== 'string' || pattern.length === 0) {
      throw new InternalServerErrorException(
        `Invalid answer key configuration for question ${questionId}`
      );
    }

    const flagsRaw = (answerKeyJson as { flags?: unknown }).flags;
    if (flagsRaw != null && typeof flagsRaw !== 'string') {
      throw new InternalServerErrorException(
        `Invalid answer key configuration for question ${questionId}`
      );
    }
    const flags = typeof flagsRaw === 'string' ? flagsRaw : undefined;

    return {
      mode: 'regex',
      pattern,
      flags
    };
  }

  private getSelectedOptionFromJson(value: unknown): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const selected = (value as { selected_option?: unknown }).selected_option;
    if (typeof selected !== 'string') {
      return null;
    }
    const trimmed = selected.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private getAnswerTextFromJson(value: unknown): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const answerText = (value as { answer_text?: unknown }).answer_text;
    if (typeof answerText !== 'string') {
      return null;
    }
    const trimmed = answerText.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
