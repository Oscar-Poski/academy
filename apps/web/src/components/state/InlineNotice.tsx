import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type InlineNoticeTone = 'info' | 'warning';

type InlineNoticeProps = {
  message: string;
  tone?: InlineNoticeTone;
  className?: string;
  role?: 'status' | 'alert' | 'note';
};

export function InlineNotice({ message, tone = 'info', className, role = 'status' }: InlineNoticeProps) {
  return (
    <p
      className={cn('stateInlineNotice', `stateInlineNotice--${tone}`, className)}
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
    >
      {message}
    </p>
  );
}
