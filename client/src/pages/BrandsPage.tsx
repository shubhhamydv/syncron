import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Brand } from '@/lib/api';
import { BrandModal } from '@/components/brands/BrandModal';
import { OperatingRulesEditor } from '@/components/brands/OperatingRulesEditor';
import { AssignmentManager } from '@/components/brands/AssignmentManager';
import { HolidaysManager } from '@/components/brands/HolidaysManager';
import { useToast } from '@/context/ToastContext';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Layers,
  Settings2,
  ShieldAlert,
} from 'lucide-react';

export const BrandsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'rules' | 'assignments' | 'holidays'>('rules');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Queries
  const { data: brands = [], refetch: refetchBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: api.getBrands,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: api.getProcesses,
  });

  const { data: operatingRules = [], refetch: refetchRules } = useQuery({
    queryKey: ['operatingRules'],
    queryFn: api.getOperatingRules,
  });

  const { data: coverageRequirements = [], refetch: refetchReqs } = useQuery({
    queryKey: ['coverageRequirements'],
    queryFn: api.getCoverageRequirements,
  });

  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: api.getAssignments,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.getEmployees(),
  });

  const { data: publicHolidays = [], refetch: refetchHolidays } = useQuery({
    queryKey: ['publicHolidays'],
    queryFn: api.getPublicHolidays,
  });

  // Delete brand mutation
  const deleteBrandMutation = useMutation({
    mutationFn: (id: string) => api.deleteBrand(id),
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Brand Deleted',
        message: 'Brand removed from database.',
      });
      refetchBrands();
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Delete Blocked',
        message: err.message || 'Cannot delete brand with operating rules or assignments.',
      });
    },
  });

  const handleDeleteBrand = (brand: Brand) => {
    if (window.confirm(`Are you sure you want to delete brand ${brand.name}?`)) {
      deleteBrandMutation.mutate(brand.id);
    }
  };

  const refreshAll = () => {
    refetchBrands();
    refetchRules();
    refetchReqs();
    refetchAssignments();
    refetchHolidays();
    queryClient.invalidateQueries({ queryKey: ['rosters'] });
    queryClient.invalidateQueries({ queryKey: ['brandView'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Brand Governance & Operating Rules</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Configure client brand portfolios, process eligibility matrices, weekly operating calendars, and SLA coverage requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingBrand(null);
            setIsBrandModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Brand</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'rules'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Operating Rules & SLA ({operatingRules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'assignments'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Assignment Matrix ({assignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('holidays')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'holidays'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Public Holidays ({publicHolidays.length})</span>
        </button>
      </div>

      {/* Brands Summary Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Client Brands Portfolio ({brands.length})
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <div
              key={b.id}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors text-xs"
            >
              <span className="font-semibold text-slate-800">{b.name}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  b.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {b.status}
              </span>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBrand(b);
                    setIsBrandModalOpen(true);
                  }}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                  title="Edit brand"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBrand(b)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  title="Delete brand"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'rules' && (
        <OperatingRulesEditor
          brands={brands}
          processes={processes}
          operatingRules={operatingRules}
          coverageRequirements={coverageRequirements}
          onSuccess={refreshAll}
        />
      )}

      {activeTab === 'assignments' && (
        <AssignmentManager
          assignments={assignments}
          employees={employees}
          brands={brands}
          processes={processes}
          onSuccess={refreshAll}
        />
      )}

      {activeTab === 'holidays' && (
        <HolidaysManager
          holidays={publicHolidays}
          onSuccess={refreshAll}
        />
      )}

      {/* Brand Modal */}
      <BrandModal
        isOpen={isBrandModalOpen}
        onClose={() => {
          setIsBrandModalOpen(false);
          setEditingBrand(null);
        }}
        onSuccess={refreshAll}
        brand={editingBrand}
      />
    </div>
  );
};
