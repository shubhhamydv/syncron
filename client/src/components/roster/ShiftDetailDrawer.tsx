import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldCheck, User, Calendar, Trash2, CheckCircle2 } from 'lucide-react';
import { api, Brand, Process, Conflict, ApiException } from '@/lib/api';
import { StatusBadge } from '../common/StatusBadge';
import { formatWeekdayDate } from '@/lib/dates';
import { useToast } from '@/context/ToastContext';

export interface SelectedShiftCell {
  entryId: string;
  employeeId: string;
  employeeName: string;
  podName: string;
  date: string;
  status: string;
  brandId: string | null;
  brandName: string | null;
  processId: string | null;
  processName: string | null;
}

interface ShiftDetailDrawerProps {
  cell: SelectedShiftCell | null;
  onClose: () => void;
  onSuccess: () => void;
  brands: Brand[];
  processes: Process[];
  conflicts: Conflict[];
}

export const ShiftDetailDrawer: React.FC<ShiftDetailDrawerProps> = ({
  cell,
  onClose,
  onSuccess,
  brands,
  processes,
  conflicts,
}) => {
  const { showMutationToast, showToast } = useToast();

  const [status, setStatus] = useState<string>('WORKING');
  const [brandId, setBrandId] = useState<string>('');
  const [processId, setProcessId] = useState<string>('');
  const [isPending, setIsPending] = useState(false);
  const [error422, setError422] = useState<{ message: string; code: string } | null>(null);

  useEffect(() => {
    if (cell) {
      setStatus(cell.status);
      setBrandId(cell.brandId || (brands[0]?.id || ''));
      setProcessId(cell.processId || (processes[0]?.id || ''));
      setError422(null);
    }
  }, [cell, brands, processes]);

  if (!cell) return null;

  // Find conflicts related to this date and brand/process
  const dayConflicts = conflicts.filter(
    (c) =>
      c.date.startsWith(cell.date) &&
      (!cell.brandId || c.brandId === cell.brandId)
  );

  const handleSave = async (override = false) => {
    setIsPending(true);
    setError422(null);

    try {
      const payload: any = {
        status,
        override,
      };

      if (status === 'WORKING') {
        payload.brandId = brandId || null;
        payload.processId = processId || null;
      } else {
        payload.brandId = null;
        payload.processId = null;
      }

      const res = await api.updateRosterEntry(cell.entryId, payload);
      showMutationToast('Shift updated successfully', res);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiException && err.status === 422) {
        setError422({ message: err.message, code: err.code });
      } else {
        showToast({
          type: 'error',
          title: 'Update Failed',
          message: err.message || 'Could not update roster entry',
        });
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm('Are you sure you want to unassign this shift?')) return;
    setIsPending(true);
    try {
      const res = await api.unassignRosterEntry(cell.entryId);
      showMutationToast('Shift unassigned', res);
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Unassign Failed',
        message: err.message || 'Could not unassign entry',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900 text-base">Shift Action Panel</h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Employee & Date Information */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-900 text-sm">{cell.employeeName}</span>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              {cell.podName}
            </span>
          </div>

          <div className="text-xs text-slate-600">
            {formatWeekdayDate(cell.date)}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-200/60">
            <span className="text-slate-500">Current Status:</span>
            <StatusBadge
              status={cell.status}
              label={cell.status === 'WORKING' && cell.brandName ? `${cell.brandName} (${cell.processName})` : undefined}
            />
          </div>
        </div>

        {/* Conflict Notice if any on this date */}
        {dayConflicts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Related Conflicts on this Date ({dayConflicts.length})
            </h4>
            {dayConflicts.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1 text-rose-900"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{c.brand?.name} - {c.process?.name}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-rose-200/70 font-mono">
                    {c.type}
                  </span>
                </div>
                <p className="text-rose-700">{c.message}</p>
                <div className="text-[11px] text-rose-600 font-medium">
                  Staffing: {c.availableStaff} / {c.requiredStaff} required
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 422 Error Banner with Override Button */}
        {error422 && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Engine Constraint Violation [{error422.code}]
                </p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">{error422.message}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isPending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Override Anyway</span>
              </button>
            </div>
          </div>
        )}

        {/* Shift Editor Form */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Edit Shift Allocation
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Shift Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="WORKING">WORKING</option>
              <option value="WEEKLY_OFF">WEEKLY_OFF</option>
              <option value="LEAVE">LEAVE</option>
              <option value="COMP_OFF">COMP_OFF</option>
              <option value="NOT_SCHEDULED">NOT_SCHEDULED</option>
            </select>
          </div>

          {status === 'WORKING' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Brand
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Process
                </label>
                <select
                  value={processId}
                  onChange={(e) => setProcessId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleUnassign}
          disabled={isPending}
          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Unassign</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-xs text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isPending}
            className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save Shift</span>
          </button>
        </div>
      </div>
    </div>
  );
};
