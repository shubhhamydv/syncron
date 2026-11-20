import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calendar,
  AlertOctagon,
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SidebarProps {
  month: number;
  year: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ month, year }) => {
  // Query open conflict count for badge
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: () => api.getDashboard(month, year),
    staleTime: 10000,
  });

  const openConflictCount = Object.values(dashboard?.openConflictsByType || {}).reduce(
    (acc, val) => acc + val,
    0
  );

  const navItems = [
    {
      to: `/dashboard?month=${month}&year=${year}`,
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      to: `/roster?month=${month}&year=${year}`,
      label: 'Monthly Roster',
      icon: Calendar,
      path: '/roster',
    },
    {
      to: `/conflicts?month=${month}&year=${year}`,
      label: 'Conflict Center',
      icon: AlertOctagon,
      path: '/conflicts',
      badge: openConflictCount > 0 ? openConflictCount : undefined,
    },
    {
      to: `/team?month=${month}&year=${year}`,
      label: 'Team & Pods',
      icon: Users,
      path: '/team',
    },
    {
      to: `/brands?month=${month}&year=${year}`,
      label: 'Brands & Rules',
      icon: Briefcase,
      path: '/brands',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight leading-none">Syncron</h1>
          <p className="text-xs text-slate-400 mt-1">Smart Roster Engine</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workforce Operations
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-md text-xs md:text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </div>

            {item.badge !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center justify-between text-[11px]">
          <span>DataStraw AI Tech Assessment</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
        </div>
      </div>
    </aside>
  );
};
