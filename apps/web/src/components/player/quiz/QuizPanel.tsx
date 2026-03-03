'use client';

import React from 'react';
import { useMemo, useState } from 'react';
import { Alert } from '@/src/components/ui';
import { submitQuizAttempt } from '@/src/lib/api-clients/quiz.browser';
import { microcopy } from '@/src/lib/copy/microcopy';
import { getErrorMessageFromUnknown } from '@/src/lib/errors/error-messages';
import type { QuizAttemptResult, QuizDelivery, QuizSubmissionRequest } from '@/src/lib/quiz-types';
import { QuizQuestionCard } from './QuizQuestionCard';

type QuizPanelProps = {
  sectionId: string;
  quizDelivery: QuizDelivery;
};

export function QuizPanel({ sectionId, quizDelivery }: QuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const orderedQuestions = useMemo(
    () => [...quizDelivery.questions].sort((a, b) => a.sortOrder - b.sortOrder),
    [quizDelivery.questions]
  );

  const hasAnyAnswer = Object.values(answers).some((value) => value.trim().length > 0);
  const isSubmitDisabled = isSubmitting || !hasAnyAnswer;

  function updateAnswer(questionId: string, value: string) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value
    }));
  }

  async function handleSubmit() {
    if (isSubmitDisabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const submissionAnswers: QuizSubmissionRequest['answers'] = [];
      for (const question of orderedQuestions) {
        const raw = answers[question.id]?.trim() ?? '';
        if (!raw) {
          continue;
        }

        if (question.type === 'mcq') {
          submissionAnswers.push({ question_id: question.id, selected_option: raw });
          continue;
        }

        submissionAnswers.push({ question_id: question.id, answer_text: raw });
      }

      const payload: QuizSubmissionRequest = {
        answers: submissionAnswers
      };

      const attempt = await submitQuizAttempt(sectionId, payload);
      setResult(attempt);
    } catch (error) {
      setErrorMessage(getErrorMessageFromUnknown(error, microcopy.quiz.submitFailed));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRetry() {
    setAnswers({});
    setResult(null);
    setErrorMessage(null);
  }

  return (
    <section
      id="section-quiz-panel"
      tabIndex={-1}
      className="playerCard quizPanel"
      aria-label={microcopy.quiz.panelTitle}
    >
      <header className="quizPanelHeader">
        <h2 className="quizPanelTitle">{microcopy.quiz.panelTitle}</h2>
        <p className="quizPanelSubtitle">{microcopy.quiz.panelSubtitle}</p>
      </header>

      <div className="quizQuestionList">
        {orderedQuestions.map((question) => (
          <QuizQuestionCard
            key={question.id}
            question={question}
            value={answers[question.id] ?? ''}
            onChange={(value) => updateAnswer(question.id, value)}
            disabled={isSubmitting}
          />
        ))}
      </div>

      <div className="quizActions">
        <button type="button" className="quizSubmitBtn" onClick={handleSubmit} disabled={isSubmitDisabled}>
          {isSubmitting ? microcopy.quiz.submitting : microcopy.quiz.submit}
        </button>
        {result ? (
          <button type="button" className="quizRetryBtn" onClick={handleRetry} disabled={isSubmitting}>
            {microcopy.quiz.retry}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="quizError" role="status">
          <Alert tone="danger">{errorMessage}</Alert>
        </div>
      ) : null}

      {result ? (
        <section className="quizResult" aria-live="polite">
          <div className="quizResultSummary">
            <span className={`quizResultBadge ${result.passed ? 'isPass' : 'isFail'}`}>
              {result.passed ? microcopy.quiz.passed : microcopy.quiz.notPassed}
            </span>
            <span className="quizResultScore">
              {microcopy.quiz.score}: {result.score}/{result.maxScore}
            </span>
            <span className="quizResultAttempt">
              {microcopy.quiz.attempt} #{result.attemptNo}
            </span>
          </div>

          <ul className="quizFeedbackList">
            {result.feedback.map((item) => (
              <li key={item.questionId} className="quizFeedbackItem">
                <span className={`quizFeedbackStatus ${item.isCorrect ? 'isCorrect' : 'isIncorrect'}`}>
                  {item.isCorrect ? microcopy.quiz.correct : microcopy.quiz.incorrect}
                </span>
                <span className="quizFeedbackPoints">
                  {item.awardedPoints} {microcopy.quiz.pointsSuffix}
                </span>
                {item.explanation ? <p className="quizFeedbackExplanation">{item.explanation}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
