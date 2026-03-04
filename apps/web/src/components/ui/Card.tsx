import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type CardVariant = 'surface' | 'subtle' | 'outlined';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardOwnProps<As extends React.ElementType> = {
  as?: As;
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  className?: string;
};

export type CardProps<As extends React.ElementType = 'div'> = CardOwnProps<As> &
  Omit<React.ComponentPropsWithoutRef<As>, keyof CardOwnProps<As>>;

export function Card<As extends React.ElementType = 'div'>({
  as,
  variant = 'surface',
  padding = 'md',
  interactive = false,
  className,
  ...rest
}: CardProps<As>) {
  const Component = as ?? 'div';

  return (
    <Component
      className={cn(
        'uiCard',
        `uiCard--${variant}`,
        `uiCard--pad-${padding}`,
        interactive && 'uiCard--interactive',
        className
      )}
      {...rest}
    />
  );
}
