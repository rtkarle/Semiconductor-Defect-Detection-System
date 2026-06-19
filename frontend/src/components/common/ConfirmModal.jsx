import React from 'react';
import { RiAlertLine } from 'react-icons/ri';

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, loading, danger = true }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl animate-slide-up">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${danger ? 'bg-red-900/40' : 'bg-brand-900/40'}`}>
            <RiAlertLine className={`text-xl ${danger ? 'text-red-400' : 'text-brand-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
