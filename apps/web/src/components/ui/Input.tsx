import React from 'react';
import { cn } from '@/src/lib/ui/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  inputClassName?: string;
};

export function Input({
  id,
  label,
  hint,
  error,
  className,
  inputClassName,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: InputProps) {
  if (label && !id) {
    throw new Error('Input requires an id when label is provided.');
  }

  const hintId = hint && id ? `${id}-hint` : undefined;
  const errorId = error && id ? `${id}-error` : undefined;

  const describedByParts = [ariaDescribedBy, hintId, errorId].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  return (
    <div className={cn('uiField', className)}>
      {label ? (
        <label className="uiLabel" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input {...rest} id={id} className={cn('uiInput', inputClassName)} aria-describedby={describedBy} />
      {hint ? (
        <p id={hintId} className="uiHint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="uiError" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
