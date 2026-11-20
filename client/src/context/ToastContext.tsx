import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  opened?: number;
  resolved?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showMutationToast: (title: string, result?: any) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, opened, resolved }: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, opened, resolved }]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const showMutationToast = useCallback(
    (title: string, result?: any) => {
      let opened = 0;
      let resolved = 0;

      if (result) {
        if (typeof result.opened === 'number') opened += result.opened;
        if (typeof result.resolved === 'number') resolved += result.resolved;
        if (Array.isArray(result.openedConflicts)) opened += result.openedConflicts.length;
        if (Array.isArray(result.resolvedConflicts)) resolved += result.resolvedConflicts.length;
        if (result.syncResults && Array.isArray(result.syncResults)) {
          for (const s of result.syncResults) {
            if (typeof s.opened === 'number') opened += s.opened;
            if (typeof s.resolved === 'number') resolved += s.resolved;
            if (Array.isArray(s.openedConflicts)) opened += s.openedConflicts.length;
            if (Array.isArray(s.resolvedConflicts)) resolved += s.resolvedConflicts.length;
          }
        }
      }

      let message = '';
      if (opened > 0 || resolved > 0) {
        message = `${opened} conflict${opened === 1 ? '' : 's'} opened, ${resolved} resolved`;
      } else {
        message = 'Roster is in sync (0 new conflicts)';
      }

      showToast({
        type: 'success',
        title,
        message,
        opened,
        resolved,
      });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, showMutationToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm transition-all duration-300 animate-slide-in ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : toast.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : toast.type === 'info' ? (
              <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="font-semibold">{toast.title}</div>
              {toast.message && <div className="text-xs opacity-90 mt-0.5">{toast.message}</div>}
              {(toast.opened !== undefined || toast.resolved !== undefined) && (toast.opened! > 0 || toast.resolved! > 0) && (
                <div className="flex gap-2 mt-2 text-xs font-medium">
                  {toast.opened! > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded">
                      +{toast.opened} opened
                    </span>
                  )}
                  {toast.resolved! > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                      ✓ {toast.resolved} resolved
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
