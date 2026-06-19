import React from 'react';
import { RiInboxLine } from 'react-icons/ri';

export default function EmptyState({ title = 'No data found', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
        <RiInboxLine className="text-slate-500 text-3xl" />
      </div>
      <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
