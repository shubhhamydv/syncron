import React, { useState } from 'react';
import { EmployeeViewRow, Conflict } from '@/lib/api';
import { StatusBadge } from '../common/StatusBadge';
import { User, Calendar, AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatWeekdayDate } from '@/lib/dates';

interface SingleEmployeeCalendarViewProps {
  rows: EmployeeViewRow[];
  conflicts: Conflict[];
}

export const SingleEmployeeCalendarView: React.FC<SingleEmployeeCalendarViewProps> = ({
  rows,
  conflicts,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    rows[0]?.employee.id || ''
  );

  if (!rows || rows.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        <User className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">No Employees Found</p>
      </div>
    );
  }

  const selectedRow = rows.find((r) => r.employee.id === selectedEmployeeId) || rows[0];

  // Map conflicts by date for this employee
  const employeeConflictsByDate = new Map<string, Conflict[]>();
  for (const c of conflicts) {
    // If conflict message mentions employee or employee is assigned
    if (c.message.toLowerCase().includes(selectedRow.employee.name.toLowerCase())) {
      if (!employeeConflictsByDate.has(c.date)) {
        employeeConflictsByDate.set(c.date, []);
      }
      employeeConflictsByDate.get(c.date)!.push(c);
    }
  }

  const workingDays = selectedRow.schedule.filter((s) => s.status === 'WORKING').length;
  const leaveDays = selectedRow.schedule.filter((s) => s.status === 'LEAVE' || s.status === 'COMP_OFF').length;

  return (
    <div className="space-y-4">
      {/* Employee Selector Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Viewing Employee Calendar:
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="text-sm font-bold text-slate-900 bg-transparent border-none p-0 focus:outline-hidden cursor-pointer"
            >
              {rows.map((r) => (
                <option key={r.employee.id} value={r.employee.id}>
                  {r.employee.name} ({r.employee.pod})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick employee stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
            {workingDays} Working Shifts
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
            {leaveDays} Off/Leave Days
          </div>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Monthly Roster Timeline for {selectedRow.employee.name}</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/70 text-[11px] uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Shift Status</th>
                <th className="px-4 py-3 font-semibold">Brand & Process Assignment</th>
                <th className="px-4 py-3 font-semibold">Diagnosis / Notes / Warnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedRow.schedule.map((entry) => {
                const dayConflicts = employeeConflictsByDate.get(entry.date) || [];

                return (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {formatWeekdayDate(entry.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {entry.brand ? (
                        <div>
                          <span className="font-semibold text-slate-900">{entry.brand.name}</span>
                          {entry.process && (
                            <span className="text-[11px] text-slate-500 font-mono ml-1.5">
                              • {entry.process.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {dayConflicts.length > 0 ? (
                        <div className="space-y-1">
                          {dayConflicts.map((c) => (
                            <div
                              key={c.id}
                              className={`flex items-start gap-1.5 p-1.5 rounded text-[11px] ${
                                c.severity === 'WARNING' || c.type === 'PREFERENCE_VIOLATION'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : 'bg-rose-50 text-rose-900 border border-rose-200'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-current" />
                              <span>{c.message}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Normal operating schedule</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
