import React from 'react';
import Link from 'next/link';
import { buttonClassName, Card } from '@/src/components/ui';
import { cn } from '@/src/lib/ui/cn';

type StateCardKind = 'loading' | 'empty' | 'error' | 'info';

type StateCardAction =
  | {
      label: string;
      onAction: () => void;
      href?: never;
    }
  | {
      label: string;
      href: string;
      onAction?: never;
    };

type StateCardProps = {
  kind: StateCardKind;
  title: string;
  message?: string;
  action?: StateCardAction;
  className?: string;
  titleAs?: 'h1' | 'h2' | 'h3';
};

export function StateCard({ kind, title, message, action, className, titleAs = 'h2' }: StateCardProps) {
  const Heading = titleAs;

  return (
    <Card className={cn('stateCard', `stateCard--${kind}`, className)} padding="md">
      <Heading className="stateCardTitle">{title}</Heading>
      {message ? <p className="stateCardMessage">{message}</p> : null}
      {action ? (
        <div className="stateActions">
          {'href' in action && typeof action.href === 'string' ? (
            <Link
              href={action.href}
              aria-label={action.label}
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
              aria-label={action.label}
              onClick={action.onAction}
            >
              {action.label}
            </button>
          )}
        </div>
      ) : null}
    </Card>
  );
}
