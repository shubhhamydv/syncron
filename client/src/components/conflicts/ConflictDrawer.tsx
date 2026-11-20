import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle, ShieldCheck, UserCheck, Calendar, Users, CheckCircle, Clock } from 'lucide-react';
import { api, Conflict, ReplacementCandidate, ApiException } from '@/lib/api';
import { StatusBadge } from '../common/StatusBadge';
import { formatWeekdayDate } from '@/lib/dates';
import { useToast } from '@/context/ToastContext';

interface ConflictDrawerProps {
  conflict: Conflict | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConflictDrawer: React.FC<ConflictDrawerProps> = ({
  conflict,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { showMutationToast, showToast } = useToast();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Load replacements candidates when conflict is OPEN
  const {
    data: candidates = [],
    isLoading: isLoadingCandidates,
    error: candidateError,
  } = useQuery({
    queryKey: ['replacements', conflict?.id],
    queryFn: () => api.getReplacements(conflict!.id),
    enabled: !!conflict?.id && conflict?.status === 'OPEN',
  });

  // Assign replacement mutation
  const assignMutation = useMutation({
    mutationFn: (employeeId: string) => api.assignReplacement(conflict!.id, employeeId),
    onSuccess: (res) => {
      showMutationToast('Replacement assigned successfully', res);
      queryClient.invalidateQueries({ queryKey: ['rosterConflicts'] });
      queryClient.invalidateQueries({ queryKey: ['replacements', conflict?.id] });
      queryClient.invalidateQueries({ queryKey: ['employeeView'] });
      queryClient.invalidateQueries({ queryKey: ['brandView'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      if (err instanceof ApiException) {
        showToast({
          type: 'error',
          title: 'Assignment Blocked',
          message: err.message,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Assignment Failed',
          message: err.message || 'Could not assign replacement.',
        });
      }
    },
  });

  if (!conflict) return null;

  const isResolved = conflict.status === 'RESOLVED';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-2">
          {isResolved ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          )}
          <h2 className="font-semibold text-slate-900 text-base">
            {isResolved ? 'Resolved Conflict Details' : 'Conflict Resolution Drawer'}
          </h2>
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
        {/* Conflict Summary Card */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Target Entity
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {conflict.brand?.name} • {conflict.process?.name}
              </h3>
            </div>
            <StatusBadge status={conflict.type} />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{formatWeekdayDate(conflict.date)}</span>
          </div>

          {/* Staffing status */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/80">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Required Staff
              </span>
              <span className="text-sm font-bold text-slate-800">
                {conflict.requiredStaff} employee(s)
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Allocated Staff
              </span>
              <span className={`text-sm font-bold ${conflict.availableStaff === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                {conflict.availableStaff} allocated
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2 text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
            <span className="font-semibold text-slate-900 block mb-1">Conflict Diagnosis:</span>
            {conflict.message}
          </div>

          {isResolved && conflict.resolvedAt && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Resolved on {new Date(conflict.resolvedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* AI / Algorithmic Replacement Engine Section */}
        {!isResolved && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Eligible Cross-Brand Replacements
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sorted by fair workload distribution (fewest working days this month first).
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {candidates.length} candidates
              </span>
            </div>

            {isLoadingCandidates ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                <Users className="w-6 h-6 text-indigo-500 animate-pulse mx-auto mb-2" />
                Scanning roster assignments and availability across all brands...
              </div>
            ) : candidateError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                Could not fetch replacements: {(candidateError as any).message}
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-6 text-center bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-amber-900">No Eligible Backups Available</p>
                <p className="text-[11px] text-amber-700 max-w-sm mx-auto">
                  Every other employee certified for process &quot;{conflict.process?.name}&quot; is either already scheduled to work, on approved leave, or on weekly off on this date.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((cand: ReplacementCandidate, idx: number) => {
                  const isSelected = selectedCandidateId === cand.employeeId;

                  return (
                    <div
                      key={cand.employeeId}
                      onClick={() => setSelectedCandidateId(cand.employeeId)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">
                              {cand.employeeName}
                            </span>
                            {idx === 0 && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                Fairest Match
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Primary Brand: <span className="text-slate-700 font-medium">{cand.primaryBrandName || 'Cross-assigned'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Month Shifts
                          </span>
                          <span className="text-xs font-bold text-slate-700 font-mono">
                            {cand.workingDaysSoFar} days
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignMutation.mutate(cand.employeeId);
                          }}
                          disabled={assignMutation.isPending}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{assignMutation.isPending && selectedCandidateId === cand.employeeId ? 'Assigning...' : 'Assign'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Conflict ID: <span className="font-mono text-slate-700">{conflict.id.substring(0, 8)}...</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
};
