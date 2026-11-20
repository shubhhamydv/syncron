import React, { useState } from 'react';
import { X, Crown, Check } from 'lucide-react';
import { Pod, Employee, api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface SetLeadModalProps {
  pod: Pod | null;
  onClose: () => void;
  onSuccess: () => void;
  employees: Employee[];
}

export const SetLeadModal: React.FC<SetLeadModalProps> = ({
  pod,
  onClose,
  onSuccess,
  employees,
}) => {
  const { showToast } = useToast();
  const [selectedLeadId, setSelectedLeadId] = useState<string>(pod?.leadEmployeeId || '');
  const [isPending, setIsPending] = useState(false);

  if (!pod) return null;

  // Filter employees belonging to this pod
  const podMembers = employees.filter((e) => e.podId === pod.id);

  const handleSave = async () => {
    setIsPending(true);
    try {
      await api.updatePod(pod.id, { leadEmployeeId: selectedLeadId || null });
      showToast({
        type: 'success',
        title: 'Pod Lead Updated',
        message: `Designated lead for ${pod.name} updated successfully.`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update pod lead.',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Designate Pod Lead</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Select a designated team lead for <strong>{pod.name}</strong>. The lead must belong to this pod.
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div
              onClick={() => setSelectedLeadId('')}
              className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                selectedLeadId === ''
                  ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span>No Lead (Unassigned)</span>
              {selectedLeadId === '' && <Check className="w-4 h-4 text-indigo-600" />}
            </div>

            {podMembers.map((emp) => {
              const isSelected = selectedLeadId === emp.id;
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedLeadId(emp.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900">{emp.name}</div>
                    <div className="text-[11px] text-slate-500">{emp.email}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
