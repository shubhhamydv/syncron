import React from 'react';
import { Pod } from '@/lib/api';
import { Users, Crown, Settings } from 'lucide-react';

interface PodsListProps {
  pods: Pod[];
  onOpenSetLead: (pod: Pod) => void;
}

export const PodsList: React.FC<PodsListProps> = ({ pods, onOpenSetLead }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {pods.map((pod) => (
        <div
          key={pod.id}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Pod
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Users className="w-3.5 h-3.5" />
                <span>{pod._count?.members || pod.members?.length || 0} members</span>
              </span>
            </div>

            <h3 className="font-bold text-slate-900 text-sm">{pod.name}</h3>

            <div className="mt-3 flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="truncate text-xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Pod Lead
                </span>
                <span className="font-semibold text-slate-800 truncate block">
                  {pod.lead ? pod.lead.name : <span className="text-slate-400 italic">Unassigned</span>}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenSetLead(pod)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Settings className="w-3 h-3 text-slate-400" />
            <span>Designate Lead</span>
          </button>
        </div>
      ))}
    </div>
  );
};
