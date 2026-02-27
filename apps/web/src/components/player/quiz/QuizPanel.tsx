'use client';

import React from 'react';
import { useMemo, useState } from 'react';
import { submitQuizAttempt } from '@/src/lib/api-clients/quiz.browser';
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
    } catch {
      setErrorMessage('Unable to submit quiz right now. Try again.');
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
    <section id="section-quiz-panel" tabIndex={-1} className="playerCard quizPanel" aria-label="Section quiz">
      <header className="quizPanelHeader">
        <h2 className="quizPanelTitle">Section Quiz</h2>
        <p className="quizPanelSubtitle">Answer the questions below and submit when you are ready.</p>
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
          {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
        {result ? (
          <button type="button" className="quizRetryBtn" onClick={handleRetry} disabled={isSubmitting}>
            Retry Quiz
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="quizError" role="status">
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <section className="quizResult" aria-live="polite">
          <div className="quizResultSummary">
            <span className={`quizResultBadge ${result.passed ? 'isPass' : 'isFail'}`}>
              {result.passed ? 'Passed' : 'Not Passed'}
            </span>
            <span className="quizResultScore">
              Score: {result.score}/{result.maxScore}
            </span>
            <span className="quizResultAttempt">Attempt #{result.attemptNo}</span>
          </div>

          <ul className="quizFeedbackList">
            {result.feedback.map((item) => (
              <li key={item.questionId} className="quizFeedbackItem">
                <span className={`quizFeedbackStatus ${item.isCorrect ? 'isCorrect' : 'isIncorrect'}`}>
                  {item.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
                <span className="quizFeedbackPoints">{item.awardedPoints} pts</span>
                {item.explanation ? <p className="quizFeedbackExplanation">{item.explanation}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
