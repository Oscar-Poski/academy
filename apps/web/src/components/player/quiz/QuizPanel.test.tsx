import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { QuizAttemptResult, QuizDelivery } from '@/src/lib/quiz-types';
import { QuizPanel } from './QuizPanel';

const submitQuizAttempt = vi.fn();

vi.mock('@/src/lib/api-clients/quiz.browser', () => ({
  submitQuizAttempt: (...args: unknown[]) => submitQuizAttempt(...args)
}));

const delivery: QuizDelivery = {
  sectionId: 'section-1',
  sectionVersionId: 'version-1',
  questions: [
    {
      id: 'q2',
      type: 'short_answer',
      prompt: 'Name a common auth header',
      options: null,
      points: 2,
      sortOrder: 2
    },
    {
      id: 'q1',
      type: 'mcq',
      prompt: 'Which method is read-only?',
      options: ['GET', 'POST'],
      points: 1,
      sortOrder: 1
    }
  ]
};

const attemptResult: QuizAttemptResult = {
  attemptId: 'attempt-1',
  userId: 'user-1',
  sectionId: 'section-1',
  sectionVersionId: 'version-1',
  attemptNo: 1,
  score: 2,
  maxScore: 3,
  passed: false,
  submittedAt: new Date().toISOString(),
  feedback: [
    {
      questionId: 'q1',
      questionType: 'mcq',
      isCorrect: true,
      awardedPoints: 1,
      expectedOption: 'GET',
      acceptedAnswers: null,
      expectedPattern: null,
      selectedOption: 'GET',
      answerText: null,
      explanation: 'GET is safe and idempotent.'
    },
    {
      questionId: 'q2',
      questionType: 'short_answer',
      isCorrect: false,
      awardedPoints: 1,
      expectedOption: null,
      acceptedAnswers: ['authorization'],
      expectedPattern: null,
      selectedOption: null,
      answerText: 'accept',
      explanation: 'Authorization is commonly used for bearer tokens.'
    }
  ]
};

describe('QuizPanel', () => {
  beforeEach(() => {
    submitQuizAttempt.mockReset();
  });

  it('renders ordered MCQ + short-answer questions', () => {
    render(<QuizPanel sectionId="section-1" quizDelivery={delivery} />);

    const headings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(headings).toEqual(['Which method is read-only?', 'Name a common auth header']);

    expect(screen.getByRole('radio', { name: 'GET' })).toBeInTheDocument();
    expect(screen.getByLabelText('Your answer')).toBeInTheDocument();
  });

  it('submit disabled/enabled transitions and success result rendering', async () => {
    submitQuizAttempt.mockResolvedValue(attemptResult);

    render(<QuizPanel sectionId="section-1" quizDelivery={delivery} />);

    const submitButton = screen.getByRole('button', { name: 'Submit Quiz' });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: 'GET' }));
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Not Passed')).toBeInTheDocument();
    });

    expect(screen.getByText('Score: 2/3')).toBeInTheDocument();
    expect(screen.getByText('Attempt #1')).toBeInTheDocument();
    expect(screen.getByText('GET is safe and idempotent.')).toBeInTheDocument();
    expect(screen.getByText('Authorization is commonly used for bearer tokens.')).toBeInTheDocument();

    expect(screen.queryByText('expectedOption')).not.toBeInTheDocument();
    expect(screen.queryByText('acceptedAnswers')).not.toBeInTheDocument();
    expect(screen.queryByText('expectedPattern')).not.toBeInTheDocument();
  });

  it('retry clears prior result and re-enables submission flow', async () => {
    submitQuizAttempt.mockResolvedValue(attemptResult);

    render(<QuizPanel sectionId="section-1" quizDelivery={delivery} />);

    fireEvent.click(screen.getByRole('radio', { name: 'GET' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Quiz' }));

    await waitFor(() => {
      expect(screen.getByText('Not Passed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry Quiz' }));

    expect(screen.queryByText('Not Passed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Quiz' })).toBeDisabled();
  });

  it('shows non-fatal error on submit failure', async () => {
    submitQuizAttempt.mockRejectedValue(new Error('network'));

    render(<QuizPanel sectionId="section-1" quizDelivery={delivery} />);

    fireEvent.click(screen.getByRole('radio', { name: 'GET' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Quiz' }));

    await waitFor(() => {
      expect(screen.getByText('Unable to submit quiz right now. Try again.')).toBeInTheDocument();
    });
    expect(document.querySelector('.uiAlert--danger')).toBeTruthy();
  });
});
