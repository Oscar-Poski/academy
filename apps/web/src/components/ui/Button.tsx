import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  loading = false,
  className
}: ButtonClassOptions = {}): string {
  return cn(
    'uiButton',
    `uiButton--${variant}`,
    `uiButton--${size}`,
    loading && 'isLoading',
    className
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      {...rest}
      className={buttonClassName({ variant, size, loading, className })}
      disabled={isDisabled}
      data-loading={loading ? 'true' : undefined}
    >
      {children}
    </button>
  );
}
