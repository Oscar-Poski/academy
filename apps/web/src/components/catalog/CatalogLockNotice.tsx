import React from 'react';

type CatalogLockNoticeProps = {
  reason: string;
  className?: string;
};

export function CatalogLockNotice({ reason, className }: CatalogLockNoticeProps) {
  return (
    <div className={`catalogLockNotice${className ? ` ${className}` : ''}`}>
      <span className="lockBadge lockBadge--locked">Locked</span>
      <span className="catalogLockReason">{reason}</span>
    </div>
  );
}
