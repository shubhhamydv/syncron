import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { Employee, EmployeeAvailability, AvailabilityTypeEnum, AvailabilityStatusEnum, api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { StatusBadge } from '../common/StatusBadge';

interface AvailabilityDrawerProps {
  employee: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AvailabilityDrawer: React.FC<AvailabilityDrawerProps> = ({
  employee,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { showMutationToast, showToast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [availType, setAvailType] = useState<AvailabilityTypeEnum>('LEAVE');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('2026-12-07');
  const [endDate, setEndDate] = useState<string>('2026-12-09');
  const [status, setStatus] = useState<AvailabilityStatusEnum>('APPROVED');
  const [reason, setReason] = useState<string>('');
  const [isPending, setIsPending] = useState(false);

  // Fetch employee availabilities
  const {
    data: availabilities = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['employeeAvailability', employee?.id],
    queryFn: () => api.getAvailabilities({ employeeId: employee!.id }),
    enabled: !!employee?.id,
  });

  if (!employee) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      const payload: any = {
        employeeId: employee.id,
        type: availType,
        status,
        reason: reason.trim() || null,
      };

      if (availType === 'WEEKLY_OFF') {
        payload.dayOfWeek = Number(dayOfWeek);
      } else {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }

      const res = await api.createAvailability(payload);
      showMutationToast('Availability record added', res);
      setShowAddForm(false);
      setReason('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['rosterConflicts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['employeeView'] });
      queryClient.invalidateQueries({ queryKey: ['brandView'] });
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to add availability',
        message: err.message || 'Validation error',
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this availability rule? Affected draft rosters will re-sync.')) return;
    try {
      const res = await api.deleteAvailability(id);
      showMutationToast('Availability rule removed', res);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['rosterConflicts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['employeeView'] });
      queryClient.invalidateQueries({ queryKey: ['brandView'] });
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        message: err.message,
      });
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-base">Availability & Leaves</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {employee.name} ({employee.email})
          </p>
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
        {/* Top Action */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Active Rules ({availabilities.length})
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancel' : 'Add Rule / Leave'}</span>
          </button>
        </div>

        {/* Add Availability Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="p-4 bg-slate-50 rounded-xl border border-indigo-200 space-y-3 shadow-inner"
          >
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
              New Availability Rule
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={availType}
                  onChange={(e) => setAvailType(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="WEEKLY_OFF">WEEKLY_OFF (Recurring)</option>
                  <option value="LEAVE">LEAVE (Date range)</option>
                  <option value="COMP_OFF">COMP_OFF (Date range)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="APPROVED">APPROVED (Active in Engine)</option>
                  <option value="PENDING">PENDING (Review Only)</option>
                </select>
              </div>
            </div>

            {availType === 'WEEKLY_OFF' ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Recurring Day of Week
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  {dayNames.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {idx} - {name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Start Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    End Date (Inclusive)
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                placeholder="e.g. Family wedding (approved)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Add Availability'}
              </button>
            </div>
          </form>
        )}

        {/* List of existing rules */}
        {isLoading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading availability records...</p>
        ) : availabilities.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            No availability restrictions set for this employee.
          </div>
        ) : (
          <div className="space-y-2">
            {availabilities.map((rule: EmployeeAvailability) => (
              <div
                key={rule.id}
                className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-xs">
                      {rule.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        rule.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rule.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    {rule.type === 'WEEKLY_OFF' && rule.dayOfWeek !== null && rule.dayOfWeek !== undefined ? (
                      <span>Every {dayNames[rule.dayOfWeek]}</span>
                    ) : (
                      <span>
                        {rule.startDate?.split('T')[0]} to {rule.endDate?.split('T')[0]} (inclusive)
                      </span>
                    )}
                  </div>

                  {rule.reason && (
                    <div className="text-[11px] text-slate-400 italic">
                      &quot;{rule.reason}&quot;
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  title="Delete availability rule"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
