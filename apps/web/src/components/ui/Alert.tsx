import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  title?: string;
};

export function Alert({ tone = 'info', title, className, children, ...rest }: AlertProps) {
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div className={cn('uiAlert', `uiAlert--${tone}`, className)} role={role} {...rest}>
      {title ? <p className="uiAlertTitle">{title}</p> : null}
      <div className="uiAlertBody">{children}</div>
    </div>
  );
}
