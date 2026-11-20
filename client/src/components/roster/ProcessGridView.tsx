import React, { useState } from 'react';
import { ProcessViewItem, ProcessViewDay, BrandViewRow } from '@/lib/api';
import { Layers, ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatWeekdayDate } from '@/lib/dates';

interface ProcessGridViewProps {
  processData: ProcessViewItem[];
}

export const ProcessGridView: React.FC<ProcessGridViewProps> = ({ processData }) => {
  const [selectedProcessId, setSelectedProcessId] = useState<string>(
    processData[0]?.processId || ''
  );
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  if (!processData || processData.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        <Layers className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">No Process Data</p>
        <p className="text-xs text-slate-400 mt-1">Make sure the active roster is generated.</p>
      </div>
    );
  }

  const activeProcess = processData.find((p) => p.processId === selectedProcessId) || processData[0];

  return (
    <div className="space-y-4">
      {/* Process Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
          Select Process:
        </span>
        {processData.map((p) => (
          <button
            key={p.processId}
            type="button"
            onClick={() => {
              setSelectedProcessId(p.processId);
              setExpandedDate(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedProcessId === p.processId
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.processName}
          </button>
        ))}
      </div>

      {/* Process Summary & Day Breakdown */}
      {activeProcess && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>{activeProcess.processName} Operations</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-semibold">
                  {activeProcess.days.length} operational dates
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily staffing requirements aggregated across all assigned brands with inline brand drilldown.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50/70 text-[11px] uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-center">Required Staff</th>
                  <th className="px-4 py-3 font-semibold text-center">Allocated Staff</th>
                  <th className="px-4 py-3 font-semibold text-center">Coverage Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeProcess.days.map((day) => {
                  const isExpanded = expandedDate === day.date;
                  return (
                    <React.Fragment key={day.date}>
                      <tr
                        onClick={() => setExpandedDate(isExpanded ? null : day.date)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {formatWeekdayDate(day.date)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                          {day.required}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                          {day.allocated}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              day.status === 'OK'
                                ? 'bg-emerald-100 text-emerald-800'
                                : day.status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {day.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <span>{day.brands.length} brand{day.brands.length === 1 ? '' : 's'}</span>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Drilldown Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-indigo-100">
                          <td colSpan={5} className="p-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-900 block">
                                Brand Staffing Breakdown for {day.date} ({activeProcess.processName})
                              </span>
                              <div className="divide-y divide-slate-100 text-xs">
                                {day.brands.map((b: BrandViewRow) => (
                                  <div key={b.brandId} className="py-2 flex items-center justify-between gap-4">
                                    <div>
                                      <span className="font-semibold text-slate-800">{b.brandName}</span>
                                      <span className="text-[11px] text-slate-500 ml-2">
                                        Assigned Staff: {b.employees.length > 0 ? b.employees.map((e) => e.name).join(', ') : 'None'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-[11px] text-slate-600">
                                        {b.allocated} / {b.required} required
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          b.coverageStatus === 'OK'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : b.coverageStatus === 'PARTIAL'
                                            ? 'bg-amber-100 text-amber-900'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {b.coverageStatus}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
