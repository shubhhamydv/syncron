import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, Conflict } from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatWeekdayDate } from '@/lib/dates';
import {
  Users,
  Building2,
  FolderGit2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const month = parseInt(searchParams.get('month') || '12', 10);
  const year = parseInt(searchParams.get('year') || '2026', 10);

  // Load Dashboard Data
  const { data: dash, isLoading: isLoadingDash } = useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: () => api.getDashboard(month, year),
  });

  // Load Brand View for Brand Rankings
  const { data: brandView = [] } = useQuery({
    queryKey: ['brandView', dash?.roster?.id],
    queryFn: () => api.getBrandView(dash!.roster!.id),
    enabled: !!dash?.roster?.id,
  });

  // Load Open Conflicts for "Needing Attention"
  const { data: openConflicts = [] } = useQuery({
    queryKey: ['rosterConflicts', dash?.roster?.id, 'OPEN'],
    queryFn: () => api.getConflicts(dash!.roster!.id, { status: 'OPEN' }),
    enabled: !!dash?.roster?.id,
  });

  if (isLoadingDash) {
    return (
      <div className="p-16 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        <TrendingUp className="w-8 h-8 text-indigo-500 animate-pulse mx-auto mb-2" />
        <p className="text-sm font-medium">Aggregating roster health and workload statistics...</p>
      </div>
    );
  }

  // Conflicts by type chart data
  const conflictTypeColors: Record<string, string> = {
    COVERAGE_GAP: '#e11d48', // rose-600
    INSUFFICIENT_STAFF: '#d97706', // amber-600
    OVERLAP: '#7c3aed', // purple-600
    LEAVE_CONFLICT: '#ea580c', // orange-600
    PREFERENCE_VIOLATION: '#f59e0b', // amber-500
  };

  const openErrors = openConflicts.filter((c) => (c.severity || 'ERROR') === 'ERROR' && c.type !== 'PREFERENCE_VIOLATION');
  const openWarnings = openConflicts.filter((c) => c.severity === 'WARNING' || c.type === 'PREFERENCE_VIOLATION');

  const chartData = Object.entries(dash?.openConflictsByType || {}).map(([key, val]) => ({
    name: key.replace(/_/g, ' '),
    rawType: key,
    count: val,
    color: conflictTypeColors[key] || '#4f46e5',
  }));

  // Aggregate Brand Health from brandView
  const brandStatsMap = new Map<string, { brandName: string; required: number; allocated: number }>();
  for (const item of brandView) {
    if (!brandStatsMap.has(item.brandId)) {
      brandStatsMap.set(item.brandId, {
        brandName: item.brandName,
        required: 0,
        allocated: 0,
      });
    }
    const b = brandStatsMap.get(item.brandId)!;
    b.required += item.required;
    b.allocated += item.allocated;
  }

  const brandRankings = Array.from(brandStatsMap.values())
    .map((b) => {
      const pct = b.required > 0 ? parseFloat(((b.allocated / b.required) * 100).toFixed(1)) : 100;
      return {
        ...b,
        percent: pct,
        status: pct >= 100 ? 'OK' : pct > 0 ? 'PARTIAL' : 'GAP',
      };
    })
    .sort((a, b) => a.percent - b.percent); // lowest coverage first

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Operations & Roster Dashboard</h1>
            {dash?.roster && <StatusBadge status={dash.roster.status} />}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time executive oversight for {month}/{year}. Pure constraint analysis of staff allocation, brand service level agreements, and conflict resolution velocity.
          </p>
        </div>

        <Link
          to={`/roster?month=${month}&year=${year}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start md:self-auto"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Open Full Roster Grid</span>
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Coverage Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Coverage Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {dash?.coveragePercent || 0}%
            </span>
            <span className="text-xs text-slate-500">
              ({dash?.filledSlots || 0} / {dash?.requiredSlots || 0} slots)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (dash?.coveragePercent || 0) >= 95
                  ? 'bg-emerald-500'
                  : (dash?.coveragePercent || 0) >= 80
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(dash?.coveragePercent || 0, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Open Conflicts Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Issues</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-3xl font-bold ${
                openErrors.length > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {openConflicts.length}
            </span>
            <Link
              to={`/conflicts?month=${month}&year=${year}`}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <span>Resolve</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            <span className="text-rose-600 font-bold">{openErrors.length} Errors</span> • <span className="text-amber-600 font-bold">{openWarnings.length} Warnings</span> ({dash?.resolvedConflicts || 0} resolved)
          </p>
        </div>

        {/* Active Staff Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Staff</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{dash?.employees || 0}</span>
            <span className="text-xs text-slate-500">across {dash?.pods || 0} pods</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Pure role & availability model active.
          </p>
        </div>

        {/* Active Brands Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Client Brands</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{dash?.brands || 0}</span>
            <span className="text-xs text-slate-500">brands monitored</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Dedicated SLAs & operating calendars.
          </p>
        </div>
      </div>

      {/* Analytics & Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conflicts Breakdown Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Open Conflicts by Category</h3>
              <p className="text-xs text-slate-500 mt-0.5">Constraint engine breakdown</p>
            </div>
            <Link
              to={`/conflicts?month=${month}&year=${year}`}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {chartData.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">Zero Open Conflicts</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All staff allocations satisfy SLA requirements.</p>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Brand Health Ranking Table */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Brand Coverage Health Ranking</h3>
              <p className="text-xs text-slate-500 mt-0.5">Lowest coverage first (vulnerable SLAs)</p>
            </div>
            <span className="text-xs text-slate-400">{brandRankings.length} brands</span>
          </div>

          <div className="overflow-y-auto max-h-64 divide-y divide-slate-100 pr-1">
            {brandRankings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No brand requirements computed yet.</p>
            ) : (
              brandRankings.map((b) => (
                <div key={b.brandName} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="truncate flex-1">
                    <span className="font-semibold text-slate-800 block truncate">{b.brandName}</span>
                    <span className="text-[10px] text-slate-400">
                      {b.allocated} / {b.required} required shifts
                    </span>
                  </div>

                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${
                        b.percent >= 100
                          ? 'bg-emerald-500'
                          : b.percent >= 80
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(b.percent, 100)}%` }}
                    ></div>
                  </div>

                  <span
                    className={`font-mono font-bold text-right w-14 shrink-0 ${
                      b.percent >= 100
                        ? 'text-emerald-700'
                        : b.percent >= 80
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {b.percent}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Conflicts Needing Attention */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-slate-900 text-sm">Conflicts Needing Attention</h3>
          </div>
          <Link
            to={`/conflicts?month=${month}&year=${year}`}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Open Conflict Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {openConflicts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-800">Clean Operating Slate</p>
            <p className="text-[11px] text-slate-400">All shifts for {month}/{year} are fully staffed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {openConflicts.slice(0, 5).map((c: Conflict) => (
              <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {c.brand?.name} • {c.process?.name}
                    </span>
                    <StatusBadge status={c.type} />
                    <span className="text-[11px] text-slate-400">
                      {formatWeekdayDate(c.date)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{c.message}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {c.availableStaff}/{c.requiredStaff} staff
                  </span>
                  <Link
                    to={`/conflicts?month=${month}&year=${year}`}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                  >
                    Resolve
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
