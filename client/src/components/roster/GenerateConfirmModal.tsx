import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface GenerateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  isDraft: boolean;
}

export const GenerateConfirmModal: React.FC<GenerateConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  isDraft,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            <span>Generate Monthly Roster</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isDraft ? (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Existing Draft Will Be Overwritten</p>
                <p className="text-xs text-amber-700 mt-1">
                  A draft roster already exists for this month. Regenerating will reset all shifts, calculate clean allocations, and re-run all constraint verifications.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Run the pure scheduling engine to evaluate all operating rules, employee working patterns, approved leaves, and minimum coverage constraints for this month.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isDraft ? 'Overwrite & Regenerate' : 'Generate Roster'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
