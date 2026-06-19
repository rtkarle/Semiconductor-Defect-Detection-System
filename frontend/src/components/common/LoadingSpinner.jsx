import React from 'react';
import clsx from 'clsx';

export default function LoadingSpinner({ size = 'md', className = '', fullPage = false }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  const spinner = (
    <div
      className={clsx(
        'rounded-full border-2 border-slate-700 border-t-brand-500 animate-spin',
        sizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950/80 z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    </div>
  );
}
