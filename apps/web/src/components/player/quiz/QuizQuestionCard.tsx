import React from 'react';
import type { QuizDeliveryQuestion } from '@/src/lib/quiz-types';

type QuizQuestionCardProps = {
  question: QuizDeliveryQuestion;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function QuizQuestionCard({ question, value, disabled = false, onChange }: QuizQuestionCardProps) {
  return (
    <article className="quizQuestionCard">
      <header className="quizQuestionHeader">
        <h3 className="quizQuestionPrompt">{question.prompt}</h3>
        <span className="quizQuestionPoints">{question.points} pt{question.points === 1 ? '' : 's'}</span>
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
          <span className="quizTextLabelText">Your answer</span>
          <input
            type="text"
            className="quizTextInput"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        </label>
      )}
    </article>
  );
}
