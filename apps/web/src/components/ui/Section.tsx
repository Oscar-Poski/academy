import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type SectionSpacing = 'sm' | 'md' | 'lg';
type SectionSurface = 'none' | 'soft';

type SectionOwnProps<As extends React.ElementType> = {
  as?: As;
  spacing?: SectionSpacing;
  surface?: SectionSurface;
  className?: string;
};

export type SectionProps<As extends React.ElementType = 'section'> = SectionOwnProps<As> &
  Omit<React.ComponentPropsWithoutRef<As>, keyof SectionOwnProps<As>>;

export function Section<As extends React.ElementType = 'section'>({
  as,
  spacing = 'md',
  surface = 'none',
  className,
  ...rest
}: SectionProps<As>) {
  const Component = as ?? 'section';

  return (
    <Component
      className={cn('uiSection', `uiSection--${spacing}`, `uiSection--${surface}`, className)}
      {...rest}
    />
  );
}
