import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type InlineNoticeTone = 'info' | 'warning';

type InlineNoticeProps = {
  message: string;
  tone?: InlineNoticeTone;
  className?: string;
};

export function InlineNotice({ message, tone = 'info', className }: InlineNoticeProps) {
  return <p className={cn('stateInlineNotice', `stateInlineNotice--${tone}`, className)}>{message}</p>;
}
