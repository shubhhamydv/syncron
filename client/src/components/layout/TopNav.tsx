import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '../common/StatusBadge';

interface TopNavProps {
  month: number;
  year: number;
}

export const TopNav: React.FC<TopNavProps> = ({ month, year }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Load current roster metadata
  const { data: rosters } = useQuery({
    queryKey: ['rosters', month, year],
    queryFn: () => api.listRosters({ month, year }),
    staleTime: 5000,
  });

  const currentRoster = rosters?.[0];

  const handleMonthChange = (newMonth: number, newYear: number) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('month', String(newMonth));
    searchParams.set('year', String(newYear));
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const prevMonth = () => {
    if (month === 1) handleMonthChange(12, year - 1);
    else handleMonthChange(month - 1, year);
  };

  const nextMonth = () => {
    if (month === 12) handleMonthChange(1, year + 1);
    else handleMonthChange(month + 1, year);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      {/* Month & Year Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-inner">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 font-semibold text-slate-800 text-sm">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <span>
              {monthNames[month - 1]} {year}
            </span>
          </div>

          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current Roster Status */}
        {currentRoster ? (
          <div className="flex items-center gap-2 text-xs">
            <StatusBadge status={currentRoster.status} />
            <span className="text-slate-400">
              ({currentRoster._count?.entries || 0} shifts, {currentRoster._count?.conflicts || 0} conflicts)
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">No roster generated yet</span>
        )}
      </div>

      {/* Right meta */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="hidden md:flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Engine Status: Online (Pure UTC)</span>
        </div>
      </div>
    </header>
  );
};
