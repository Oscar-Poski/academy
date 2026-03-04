import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
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
  disabled = false,
  className
}: ButtonClassOptions = {}): string {
  return cn(
    'uiButton',
    `uiButton--${variant}`,
    `uiButton--${size}`,
    disabled && 'isDisabled',
    loading && 'isLoading',
    className
  );
}

export function actionClassName(options: ButtonClassOptions = {}): string {
  return buttonClassName(options);
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
      className={buttonClassName({ variant, size, loading, disabled: isDisabled, className })}
      disabled={isDisabled}
      data-loading={loading ? 'true' : undefined}
    >
      {children}
    </button>
  );
}
