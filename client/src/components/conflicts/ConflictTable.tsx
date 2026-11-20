import React from 'react';
import { Conflict } from '@/lib/api';
import { StatusBadge } from '../common/StatusBadge';
import { formatWeekdayDate } from '@/lib/dates';
import { ChevronRight, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface ConflictTableProps {
  conflicts: Conflict[];
  onSelectConflict: (conflict: Conflict) => void;
}

export const ConflictTable: React.FC<ConflictTableProps> = ({
  conflicts,
  onSelectConflict,
}) => {
  if (conflicts.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">No conflicts in this category</p>
        <p className="text-xs text-slate-400 mt-1">All operating requirements and constraints are satisfied.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Brand & Process</th>
            <th className="px-4 py-3 font-semibold">Conflict Type</th>
            <th className="px-4 py-3 font-semibold text-center">Staffing Level</th>
            <th className="px-4 py-3 font-semibold">Diagnosis</th>
            <th className="px-4 py-3 font-semibold text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {conflicts.map((conflict) => {
            const isResolved = conflict.status === 'RESOLVED';

            return (
              <tr
                key={conflict.id}
                onClick={() => onSelectConflict(conflict)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                {/* Date */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-semibold text-slate-800">
                    {formatWeekdayDate(conflict.date)}
                  </div>
                </td>

                {/* Brand & Process */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-semibold text-slate-900">
                    {conflict.brand?.name || conflict.brandId}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {conflict.process?.name || conflict.processId}
                  </div>
                </td>

                {/* Conflict Type */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={conflict.type} />
                </td>

                {/* Staffing */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                      conflict.availableStaff === 0
                        ? 'bg-rose-100 text-rose-800'
                        : conflict.availableStaff < conflict.requiredStaff
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {conflict.availableStaff} / {conflict.requiredStaff} staff
                  </span>
                </td>

                {/* Message */}
                <td className="px-4 py-3 max-w-md">
                  <p className="text-slate-600 line-clamp-2 text-xs leading-relaxed">
                    {conflict.message}
                  </p>
                </td>

                {/* Action */}
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectConflict(conflict);
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isResolved
                        ? 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                        : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs'
                    }`}
                  >
                    <span>{isResolved ? 'Audit Details' : 'Resolve'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
