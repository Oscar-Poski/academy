import React from 'react';
import { Card } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';
import type { QuizDeliveryQuestion } from '@/src/lib/quiz-types';

type QuizQuestionCardProps = {
  question: QuizDeliveryQuestion;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function QuizQuestionCard({ question, value, disabled = false, onChange }: QuizQuestionCardProps) {
  return (
    <Card as="article" className="quizQuestionCard" padding="none">
      <header className="quizQuestionHeader">
        <h3 className="quizQuestionPrompt">{question.prompt}</h3>
        <span className="quizQuestionPoints">{question.points} {microcopy.quiz.pointsSuffix}</span>
      </header>

      {question.type === 'mcq' ? (
        <div className="quizOptions" role="group" aria-label={question.prompt}>
          {(question.options ?? []).map((option) => (
            <label key={option} className="quizOptionLabel">
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={value === option}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : (
        <label className="quizTextLabel">
          <span className="quizTextLabelText">{microcopy.quiz.yourAnswer}</span>
          <input
            type="text"
            className="quizTextInput"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        </label>
      )}
    </Card>
  );
}
