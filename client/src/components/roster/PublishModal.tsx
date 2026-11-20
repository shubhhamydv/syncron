import React from 'react';
import { AlertCircle, CheckCircle, ShieldAlert, X } from 'lucide-react';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (force: boolean) => void;
  openConflictsCount: number;
  isPending: boolean;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  openConflictsCount,
  isPending,
}) => {
  if (!isOpen) return null;

  const hasConflicts = openConflictsCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
            {hasConflicts ? (
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            )}
            <span>Publish Roster</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {hasConflicts ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unresolved Conflicts Detected</p>
                  <p className="text-xs text-rose-700 mt-1">
                    There are <span className="font-bold underline">{openConflictsCount} open conflict(s)</span> (coverage gaps, staff shortages, or multi-brand overlaps) remaining in this roster.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Publishing freezes the roster into an active state. You can resolve remaining issues first in the <strong>Conflict Center</strong>, or explicitly force publish with remaining gaps.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              All coverage constraints and employee shift allocations are satisfied with zero conflicts. Publishing locks this schedule for production use.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {hasConflicts ? (
              <button
                type="button"
                onClick={() => onPublish(true)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isPending ? 'Publishing...' : 'Force Publish Anyway'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPublish(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isPending ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
