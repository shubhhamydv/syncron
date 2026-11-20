import React from 'react';
import { EmployeeViewRow } from '@/lib/api';
import { DayHeader, getBrandInitials } from '@/lib/dates';
import { SelectedShiftCell } from './ShiftDetailDrawer';

interface EmployeeGridProps {
  days: DayHeader[];
  rows: EmployeeViewRow[];
  onSelectCell: (cell: SelectedShiftCell) => void;
}

export const EmployeeGrid: React.FC<EmployeeGridProps> = ({
  days,
  rows,
  onSelectCell,
}) => {
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-medium">No employees match the current filters.</p>
        <p className="text-xs text-slate-400 mt-1">Try resetting the pod, brand, or search filters.</p>
      </div>
    );
  }

  // Calculate working day counts for each employee
  const workingDayCounts = new Map<string, number>();
  for (const row of rows) {
    const workingDays = row.schedule.filter((s) => s.status === 'WORKING').length;
    workingDayCounts.set(row.employee.id, workingDays);
  }

  return (
    <div className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-xs text-left border-collapse">
        {/* Sticky Header */}
        <thead className="text-[11px] uppercase bg-slate-100/90 text-slate-600 sticky top-0 z-20 backdrop-blur-xs shadow-xs">
          <tr>
            {/* Sticky Employee Column Header */}
            <th className="sticky left-0 z-30 bg-slate-100 px-4 py-3 min-w-[220px] max-w-[220px] font-semibold border-b border-r border-slate-200 shadow-r">
              <div className="flex items-center justify-between">
                <span>Employee</span>
                <span className="text-[10px] text-slate-400 font-normal">Pod</span>
              </div>
            </th>

            {/* Total Working Days Column */}
            <th className="px-3 py-3 w-16 text-center font-semibold border-b border-r border-slate-200 bg-slate-100">
              Shifts
            </th>

            {/* Date Columns 1-31 */}
            {days.map((d) => (
              <th
                key={d.dateStr}
                className={`px-1 py-2 text-center min-w-[42px] border-b border-r border-slate-200 ${
                  d.isWeekend ? 'bg-slate-200/60 font-bold text-slate-800' : 'bg-slate-100'
                }`}
              >
                <div className="text-[10px] text-slate-400">{d.dayName}</div>
                <div className="text-xs font-semibold">{d.dayNumber}</div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Rows */}
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const shiftCount = workingDayCounts.get(row.employee.id) || 0;
            // Map schedule entries by date
            const scheduleMap = new Map(row.schedule.map((s) => [s.date.split('T')[0], s]));

            return (
              <tr key={row.employee.id} className="hover:bg-slate-50/70 transition-colors">
                {/* Sticky Employee Column */}
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-slate-900 border-r border-slate-200 shadow-r min-w-[220px] max-w-[220px]">
                  <div className="flex items-center justify-between truncate">
                    <span className="truncate font-semibold text-slate-800" title={row.employee.name}>
                      {row.employee.name}
                    </span>
                    <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 ml-2">
                      {row.employee.pod}
                    </span>
                  </div>
                </td>

                {/* Shift Count Badge */}
                <td className="px-2 py-2 text-center border-r border-slate-200 font-medium">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono ${
                      shiftCount > 24
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : shiftCount < 18
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-indigo-50 text-indigo-700 font-semibold'
                    }`}
                  >
                    {shiftCount}d
                  </span>
                </td>

                {/* Date Cells */}
                {days.map((d) => {
                  const entry = scheduleMap.get(d.dateStr);
                  const status = entry?.status || 'NOT_SCHEDULED';
                  const brandCode =
                    entry?.brand ? getBrandInitials(entry.brand.name) : '';

                  let cellClass = 'bg-slate-50 text-slate-400 hover:bg-slate-100';
                  let label = '-';

                  if (status === 'WORKING') {
                    cellClass = 'bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100 border border-emerald-200/60';
                    label = brandCode || 'W';
                  } else if (status === 'WEEKLY_OFF') {
                    cellClass = 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                    label = 'OFF';
                  } else if (status === 'LEAVE') {
                    cellClass = 'bg-rose-100 text-rose-800 font-bold hover:bg-rose-200 border border-rose-200';
                    label = 'LV';
                  } else if (status === 'COMP_OFF') {
                    cellClass = 'bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 border border-amber-200';
                    label = 'CO';
                  } else if (status === 'HOLIDAY_OFF') {
                    cellClass = 'bg-purple-100 text-purple-800 font-medium hover:bg-purple-200 border border-purple-200';
                    label = 'HD';
                  }

                  return (
                    <td
                      key={d.dateStr}
                      className={`p-1 text-center border-r border-slate-100 ${
                        d.isWeekend && status === 'NOT_SCHEDULED' ? 'bg-slate-100/40' : ''
                      }`}
                    >
                      {entry ? (
                        <button
                          type="button"
                          onClick={() =>
                            onSelectCell({
                              entryId: entry.id,
                              employeeId: row.employee.id,
                              employeeName: row.employee.name,
                              podName: row.employee.pod,
                              date: d.dateStr,
                              status: entry.status,
                              brandId: entry.brand?.id || null,
                              brandName: entry.brand?.name || null,
                              processId: entry.process?.id || null,
                              processName: entry.process?.name || null,
                            })
                          }
                          title={`${row.employee.name} - ${d.dateStr}: ${status}${
                            entry.brand ? ` (${entry.brand.name})` : ''
                          }`}
                          className={`w-full py-1.5 px-0.5 rounded text-[11px] transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${cellClass}`}
                        >
                          {label}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300 select-none">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
