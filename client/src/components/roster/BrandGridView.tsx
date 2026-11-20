import React from 'react';
import { BrandViewRow } from '@/lib/api';
import { DayHeader } from '@/lib/dates';

interface BrandGridViewProps {
  days: DayHeader[];
  brandViewData: BrandViewRow[];
}

interface GroupedBrandRow {
  key: string;
  brandId: string;
  brandName: string;
  processId: string;
  processName: string;
  // map of dateStr -> BrandViewRow
  dateMap: Map<string, BrandViewRow>;
}

export const BrandGridView: React.FC<BrandGridViewProps> = ({
  days,
  brandViewData,
}) => {
  if (brandViewData.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-medium">No operational coverage requirements found for this roster.</p>
        <p className="text-xs text-slate-400 mt-1">Generate a roster to compute daily brand coverage.</p>
      </div>
    );
  }

  // Group by brandId + processId
  const rowMap = new Map<string, GroupedBrandRow>();
  for (const item of brandViewData) {
    const key = `${item.brandId}_${item.processId}`;
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        key,
        brandId: item.brandId,
        brandName: item.brandName,
        processId: item.processId,
        processName: item.processName,
        dateMap: new Map(),
      });
    }
    rowMap.get(key)!.dateMap.set(item.date, item);
  }

  const rows = Array.from(rowMap.values()).sort((a, b) =>
    a.brandName.localeCompare(b.brandName) || a.processName.localeCompare(b.processName)
  );

  return (
    <div className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-xs text-left border-collapse">
        {/* Sticky Header */}
        <thead className="text-[11px] uppercase bg-slate-100/90 text-slate-600 sticky top-0 z-20 backdrop-blur-xs shadow-xs">
          <tr>
            <th className="sticky left-0 z-30 bg-slate-100 px-4 py-3 min-w-[240px] max-w-[240px] font-semibold border-b border-r border-slate-200 shadow-r">
              <div className="flex items-center justify-between">
                <span>Brand & Process</span>
                <span className="text-[10px] text-slate-400 font-normal">Target</span>
              </div>
            </th>

            {days.map((d) => (
              <th
                key={d.dateStr}
                className={`px-1 py-2 text-center min-w-[50px] border-b border-r border-slate-200 ${
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
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
              {/* Sticky Brand/Process Column */}
              <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-slate-900 border-r border-slate-200 shadow-r min-w-[240px] max-w-[240px]">
                <div className="flex flex-col truncate">
                  <span className="font-semibold text-slate-800 truncate" title={row.brandName}>
                    {row.brandName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Process: {row.processName}
                  </span>
                </div>
              </td>

              {/* Date Cells */}
              {days.map((d) => {
                const req = row.dateMap.get(d.dateStr);

                if (!req) {
                  return (
                    <td
                      key={d.dateStr}
                      className={`p-1 text-center border-r border-slate-100 ${
                        d.isWeekend ? 'bg-slate-100/30' : ''
                      }`}
                    >
                      <span className="text-[10px] text-slate-300">-</span>
                    </td>
                  );
                }

                let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                if (req.coverageStatus === 'GAP') {
                  badgeClass = 'bg-rose-100 text-rose-800 font-bold border-rose-300 animate-pulse';
                } else if (req.coverageStatus === 'PARTIAL') {
                  badgeClass = 'bg-amber-100 text-amber-900 font-semibold border-amber-300';
                }

                const empNames = req.employees?.map((e) => e.name).join(', ') || 'None';

                return (
                  <td
                    key={d.dateStr}
                    className="p-1 text-center border-r border-slate-100"
                  >
                    <div
                      title={`${row.brandName} (${row.processName}) on ${d.dateStr}: ${req.allocated}/${req.required} staff (${req.coverageStatus}). Allocated: ${empNames}`}
                      className={`py-1 px-1 rounded text-[11px] font-mono border text-center transition-all ${badgeClass}`}
                    >
                      {req.allocated}/{req.required}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
