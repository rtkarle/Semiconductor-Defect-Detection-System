import React from 'react';
import clsx from 'clsx';

const CONFIG = {
  low:      { label: 'Low',      cls: 'badge-low' },
  medium:   { label: 'Medium',   cls: 'badge-medium' },
  high:     { label: 'High',     cls: 'badge-high' },
  critical: { label: 'Critical', cls: 'badge-critical' },
};

export default function SeverityBadge({ severity, className = '' }) {
  const cfg = CONFIG[severity] || { label: severity, cls: 'badge-pending' };
  return (
    <span className={clsx('badge', cfg.cls, className)}>
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status, className = '' }) {
  const cls = {
    completed:  'badge-completed',
    processing: 'badge-processing',
    pending:    'badge-pending',
    failed:     'badge-failed',
    ready:      'badge-completed',
    generating: 'badge-processing',
  }[status] || 'badge-pending';

  return (
    <span className={clsx('badge', cls, className)}>
      {status}
    </span>
  );
}
