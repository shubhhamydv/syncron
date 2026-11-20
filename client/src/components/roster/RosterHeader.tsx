import React from 'react';
import { Search, RefreshCw, Send, Users, Building2 } from 'lucide-react';
import { Pod, Brand, Roster } from '@/lib/api';

interface RosterHeaderProps {
  roster: Roster | null;
  viewMode: 'employee' | 'brand';
  setViewMode: (mode: 'employee' | 'brand') => void;
  onOpenGenerate: () => void;
  onOpenPublish: () => void;
  isGenerating: boolean;
  pods: Pod[];
  brands: Brand[];
  selectedPodId: string;
  setSelectedPodId: (id: string) => void;
  selectedBrandId: string;
  setSelectedBrandId: (id: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  searchEmployee: string;
  setSearchEmployee: (q: string) => void;
  openConflictsCount: number;
}

export const RosterHeader: React.FC<RosterHeaderProps> = ({
  roster,
  viewMode,
  setViewMode,
  onOpenGenerate,
  onOpenPublish,
  isGenerating,
  pods,
  brands,
  selectedPodId,
  setSelectedPodId,
  selectedBrandId,
  setSelectedBrandId,
  selectedStatus,
  setSelectedStatus,
  searchEmployee,
  setSearchEmployee,
  openConflictsCount,
}) => {
  const isPublished = roster?.status === 'PUBLISHED';

  return (
    <div className="space-y-4">
      {/* Top Bar: Action Buttons & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setViewMode('employee')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'employee'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employee Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('brand')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'brand'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Brand Operational View</span>
          </button>
        </div>

        {/* Right: Generate & Publish Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenGenerate}
            disabled={isGenerating || isPublished}
            title={isPublished ? 'Roster is PUBLISHED and cannot be regenerated' : 'Generate Roster'}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{roster ? 'Regenerate Roster' : 'Generate Roster'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPublish}
            disabled={!roster || isPublished}
            title={
              !roster
                ? 'Generate a roster first'
                : isPublished
                ? 'This roster has already been published'
                : openConflictsCount > 0
                ? `${openConflictsCount} open conflicts remaining`
                : 'Publish Roster'
            }
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
              isPublished
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPublished ? 'Roster Published' : 'Publish Roster'}</span>
            {!isPublished && openConflictsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                {openConflictsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Employee Search */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Pod Filter */}
          <select
            value={selectedPodId}
            onChange={(e) => setSelectedPodId(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          {viewMode === 'employee' && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="WORKING">Working (W)</option>
              <option value="WEEKLY_OFF">Weekly Off (OFF)</option>
              <option value="LEAVE">Leave (LV)</option>
              <option value="COMP_OFF">Comp Off (CO)</option>
              <option value="HOLIDAY_OFF">Holiday (HD)</option>
            </select>
          )}

          {(selectedPodId || selectedBrandId || selectedStatus || searchEmployee) && (
            <button
              type="button"
              onClick={() => {
                setSelectedPodId('');
                setSelectedBrandId('');
                setSelectedStatus('');
                setSearchEmployee('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 hover:bg-indigo-50 rounded"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <span className="text-slate-400 font-medium">Legend:</span>
          {viewMode === 'employee' ? (
            <>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-bold inline-flex items-center justify-center">W</span>
                <span>Working</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold inline-flex items-center justify-center">OFF</span>
                <span>Off</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3.5 rounded bg-rose-100 border border-rose-300 text-rose-800 text-[9px] font-bold inline-flex items-center justify-center">LV</span>
                <span>Leave</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3.5 rounded bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-bold inline-flex items-center justify-center">CO</span>
                <span>Comp</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3.5 rounded bg-purple-100 border border-purple-300 text-purple-800 text-[9px] font-bold inline-flex items-center justify-center">HD</span>
                <span>Holiday</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-400 inline-block"></span>
                <span>OK (Met)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400 inline-block"></span>
                <span>PARTIAL (Shortage)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-400 inline-block"></span>
                <span>GAP (0 staff)</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
