import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type BadgeSize = 'sm' | 'md';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  size?: BadgeSize;
};

export function Badge({ tone = 'neutral', size = 'md', className, ...rest }: BadgeProps) {
  return <span className={cn('uiBadge', `uiBadge--${tone}`, `uiBadge--${size}`, className)} {...rest} />;
}
