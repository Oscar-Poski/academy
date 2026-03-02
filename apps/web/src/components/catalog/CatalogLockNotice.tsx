import React from 'react';
import { microcopy } from '@/src/lib/copy/microcopy';

type CatalogLockNoticeProps = {
  reason: string;
  className?: string;
};

export function CatalogLockNotice({ reason, className }: CatalogLockNoticeProps) {
  return (
    <div className={`catalogLockNotice${className ? ` ${className}` : ''}`}>
      <span className="lockBadge lockBadge--locked">{microcopy.catalog.locked}</span>
      <span className="catalogLockReason">{reason}</span>
    </div>
  );
}
