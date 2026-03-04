import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type ContainerSize = 'content' | 'wide' | 'full';

type ContainerOwnProps<As extends React.ElementType> = {
  as?: As;
  size?: ContainerSize;
  className?: string;
};

export type ContainerProps<As extends React.ElementType = 'div'> = ContainerOwnProps<As> &
  Omit<React.ComponentPropsWithoutRef<As>, keyof ContainerOwnProps<As>>;

export function Container<As extends React.ElementType = 'div'>({
  as,
  size = 'content',
  className,
  ...rest
}: ContainerProps<As>) {
  const Component = as ?? 'div';

  return <Component className={cn('uiContainer', `uiContainer--${size}`, className)} {...rest} />;
}
