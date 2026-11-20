import React from 'react';
import { PodViewItem } from '@/lib/api';
import { ShieldCheck, UserCheck, Users, CalendarCheck, Mail } from 'lucide-react';

interface PodGridViewProps {
  podData: PodViewItem[];
}

export const PodGridView: React.FC<PodGridViewProps> = ({ podData }) => {
  if (!podData || podData.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        <Users className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">No Pod Data Found</p>
        <p className="text-xs text-slate-400 mt-1">Make sure the active roster is generated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {podData.map((pod) => (
          <div
            key={pod.podId}
            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col hover:border-indigo-200 transition-colors"
          >
            {/* Pod Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">{pod.podName}</h3>
                </div>
                {pod.lead ? (
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-600">
                    <span className="font-medium">Lead:</span>
                    <span className="font-semibold text-indigo-900">{pod.lead.name}</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                      Pod Lead
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-slate-400 italic">No Lead Assigned</div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Members</span>
                <span className="text-xs font-bold text-slate-800">{pod.totalMembers}</span>
              </div>
            </div>

            {/* Pod Stats Banner */}
            <div className="px-4 py-2.5 bg-indigo-50/50 border-b border-indigo-100/60 flex items-center justify-between text-xs">
              <span className="text-indigo-900 font-medium flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Total Shifts Scheduled:</span>
              </span>
              <span className="font-mono font-bold text-indigo-950 px-2 py-0.5 rounded bg-white border border-indigo-200 text-xs">
                {pod.totalShifts} shifts
              </span>
            </div>

            {/* Member List */}
            <div className="p-4 flex-1 divide-y divide-slate-100">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Pod Members & Utilization
              </span>
              {pod.members.map((member) => (
                <div
                  key={member.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 truncate">{member.name}</span>
                      {member.isLead && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold">
                          Lead
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-300" />
                      <span>{member.email}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {member.workingDaysCount} days
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
