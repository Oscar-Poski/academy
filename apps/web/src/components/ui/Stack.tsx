import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type StackGap = 'xs' | 'sm' | 'md' | 'lg';

type StackOwnProps<As extends React.ElementType> = {
  as?: As;
  gap?: StackGap;
  className?: string;
};

export type StackProps<As extends React.ElementType = 'div'> = StackOwnProps<As> &
  Omit<React.ComponentPropsWithoutRef<As>, keyof StackOwnProps<As>>;

export function Stack<As extends React.ElementType = 'div'>({
  as,
  gap = 'md',
  className,
  ...rest
}: StackProps<As>) {
  const Component = as ?? 'div';

  return <Component className={cn('uiStack', `uiStack--${gap}`, className)} {...rest} />;
}
