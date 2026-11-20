import React from 'react';
import { ChangeImpactItem } from '@/lib/api';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChangeImpactPanelProps {
  impact: ChangeImpactItem[];
  onClose?: () => void;
}

export const ChangeImpactPanel: React.FC<ChangeImpactPanelProps> = ({ impact, onClose }) => {
  if (!impact || impact.length === 0) return null;

  const gapCount = impact.filter((i) => i.status === 'GAP').length;
  const partialCount = impact.filter((i) => i.status === 'PARTIAL').length;
  const stillCoveredCount = impact.filter((i) => i.status === 'STILL_COVERED').length;

  return (
    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden text-xs">
      {/* Header */}
      <div className="bg-indigo-50/80 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
            <span>Impact of This Change</span>
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-indigo-200/60 text-indigo-800">
              {impact.length} slot{impact.length === 1 ? '' : 's'} affected
            </span>
          </h4>
          <p className="text-[11px] text-indigo-700/80 mt-0.5">
            Operational coverage analysis across active draft rosters.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-indigo-400 hover:text-indigo-700 text-xs font-semibold px-2 py-1 rounded"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Summary chips */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3 text-[11px]">
        {gapCount > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            {gapCount} Gap{gapCount === 1 ? '' : 's'} Created
          </span>
        )}
        {partialCount > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {partialCount} Partial Coverage
          </span>
        )}
        {stillCoveredCount > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {stillCoveredCount} Still Covered
          </span>
        )}
      </div>

      {/* Impact slots list */}
      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
        {impact.map((item, idx) => {
          const remaining = item.allocatedAfterEmployees || item.employeeNames || [];
          const reqCount = item.requiredStaff ?? item.required ?? 1;
          return (
            <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
              <div>
                <div className="font-semibold text-slate-800">
                  {item.date} • {item.brandName}
                </div>
                <div className="text-[11px] text-slate-500">
                  Process: {item.processName} | Remaining: {remaining.length > 0 ? remaining.join(', ') : 'None'}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    item.status === 'STILL_COVERED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.status === 'PARTIAL'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {item.status === 'STILL_COVERED' ? 'STILL COVERED' : item.status}
                </span>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Staff: {item.allocatedBefore} → {item.allocatedAfter} / {reqCount} req
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
