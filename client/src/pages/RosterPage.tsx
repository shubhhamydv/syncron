import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiException } from '@/lib/api';
import { getMonthDays } from '@/lib/dates';
import { useToast } from '@/context/ToastContext';
import { RosterHeader } from '@/components/roster/RosterHeader';
import { EmployeeGrid } from '@/components/roster/EmployeeGrid';
import { BrandGridView } from '@/components/roster/BrandGridView';
import { ShiftDetailDrawer, SelectedShiftCell } from '@/components/roster/ShiftDetailDrawer';
import { GenerateConfirmModal } from '@/components/roster/GenerateConfirmModal';
import { PublishModal } from '@/components/roster/PublishModal';
import { AlertCircle, Calendar } from 'lucide-react';

export const RosterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const month = parseInt(searchParams.get('month') || '12', 10);
  const year = parseInt(searchParams.get('year') || '2026', 10);

  // View state
  const [viewMode, setViewMode] = useState<'employee' | 'brand'>('employee');
  const [selectedPodId, setSelectedPodId] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchEmployee, setSearchEmployee] = useState<string>('');

  // Modals & Panels state
  const [selectedCell, setSelectedCell] = useState<SelectedShiftCell | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);

  // Month days array
  const days = getMonthDays(year, month);

  // Query: Roster Metadata
  const {
    data: rosters,
    isLoading: isLoadingRoster,
    refetch: refetchRoster,
  } = useQuery({
    queryKey: ['rosters', month, year],
    queryFn: () => api.listRosters({ month, year }),
  });

  const roster = rosters?.[0] || null;

  // Query: Employee Grid View
  const {
    data: employeeRows = [],
    isLoading: isLoadingEmployeeView,
    refetch: refetchEmployeeView,
  } = useQuery({
    queryKey: ['employeeView', roster?.id],
    queryFn: () => api.getEmployeeView(roster!.id),
    enabled: !!roster?.id,
  });

  // Query: Brand Operational View
  const {
    data: brandViewData = [],
    isLoading: isLoadingBrandView,
    refetch: refetchBrandView,
  } = useQuery({
    queryKey: ['brandView', roster?.id],
    queryFn: () => api.getBrandView(roster!.id),
    enabled: !!roster?.id && viewMode === 'brand',
  });

  // Query: Conflicts for badge and drawer
  const { data: conflicts = [], refetch: refetchConflicts } = useQuery({
    queryKey: ['rosterConflicts', roster?.id],
    queryFn: () => api.getConflicts(roster!.id),
    enabled: !!roster?.id,
  });

  const openConflictsCount = conflicts.filter((c) => c.status === 'OPEN').length;

  // Auxiliary data queries
  const { data: pods = [] } = useQuery({
    queryKey: ['pods'],
    queryFn: api.getPods,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: api.getBrands,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: api.getProcesses,
  });

  // Mutation: Generate Roster
  const generateMutation = useMutation({
    mutationFn: () => api.generateRoster(month, year),
    onSuccess: (data) => {
      showToast({
        type: 'success',
        title: 'Roster Generated',
        message: `Generated schedule for ${month}/${year} with ${data.conflictsCount} conflict(s).`,
      });
      setShowGenerateModal(false);
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      queryClient.invalidateQueries({ queryKey: ['employeeView'] });
      queryClient.invalidateQueries({ queryKey: ['brandView'] });
      queryClient.invalidateQueries({ queryKey: ['rosterConflicts'] });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Generation Failed',
        message: err.message || 'Failed to generate roster.',
      });
    },
  });

  // Mutation: Publish Roster
  const publishMutation = useMutation({
    mutationFn: (force: boolean) => api.publishRoster(roster!.id, force),
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Roster Published',
        message: `Roster for ${month}/${year} is now official and locked.`,
      });
      setShowPublishModal(false);
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
    },
    onError: (err: any) => {
      if (err instanceof ApiException && err.status === 409) {
        // Open the modal explaining conflicts
        setShowPublishModal(true);
      } else {
        showToast({
          type: 'error',
          title: 'Publish Failed',
          message: err.message || 'Could not publish roster.',
        });
      }
    },
  });

  const refreshAllRosterData = () => {
    refetchRoster();
    refetchEmployeeView();
    refetchBrandView();
    refetchConflicts();
  };

  // Filter rows
  const filteredEmployeeRows = employeeRows.filter((row) => {
    // Search
    if (searchEmployee.trim()) {
      const q = searchEmployee.toLowerCase();
      const matchName = row.employee.name.toLowerCase().includes(q);
      const matchEmail = row.employee.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    // Pod
    if (selectedPodId) {
      const podObj = pods.find((p) => p.id === selectedPodId);
      if (podObj && !row.employee.pod.includes(podObj.name)) {
        return false;
      }
    }

    // Brand
    if (selectedBrandId) {
      const workedBrand = row.schedule.some((s) => s.brand?.id === selectedBrandId);
      if (!workedBrand) return false;
    }

    // Status
    if (selectedStatus) {
      const hasStatus = row.schedule.some((s) => s.status === selectedStatus);
      if (!hasStatus) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <RosterHeader
        roster={roster}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenGenerate={() => setShowGenerateModal(true)}
        onOpenPublish={() => setShowPublishModal(true)}
        isGenerating={generateMutation.isPending}
        pods={pods}
        brands={brands}
        selectedPodId={selectedPodId}
        setSelectedPodId={setSelectedPodId}
        selectedBrandId={selectedBrandId}
        setSelectedBrandId={setSelectedBrandId}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        searchEmployee={searchEmployee}
        setSearchEmployee={setSearchEmployee}
        openConflictsCount={openConflictsCount}
      />

      {/* Main Content Area */}
      {isLoadingRoster ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <Calendar className="w-8 h-8 animate-pulse text-indigo-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Loading roster data...</p>
        </div>
      ) : !roster ? (
        <div className="p-16 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No Roster for {month}/{year}</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            There is currently no generated roster for this month. Run the pure scheduling engine to evaluate operating rules and availability.
          </p>
          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            {generateMutation.isPending ? 'Generating Roster...' : 'Generate December 2026 Roster'}
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'employee' ? (
            isLoadingEmployeeView ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <p className="text-sm">Loading employee schedule grid...</p>
              </div>
            ) : (
              <EmployeeGrid
                days={days}
                rows={filteredEmployeeRows}
                onSelectCell={setSelectedCell}
              />
            )
          ) : (
            isLoadingBrandView ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <p className="text-sm">Loading brand operational requirements...</p>
              </div>
            ) : (
              <BrandGridView days={days} brandViewData={brandViewData} />
            )
          )}
        </>
      )}

      {/* Side Drawer for Cell Inspection & Manual Edits */}
      <ShiftDetailDrawer
        cell={selectedCell}
        onClose={() => setSelectedCell(null)}
        onSuccess={refreshAllRosterData}
        brands={brands}
        processes={processes}
        conflicts={conflicts}
      />

      {/* Generate Confirm Modal */}
      <GenerateConfirmModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onConfirm={() => generateMutation.mutate()}
        isPending={generateMutation.isPending}
        isDraft={roster?.status === 'DRAFT'}
      />

      {/* Publish Modal */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={(force) => publishMutation.mutate(force)}
        openConflictsCount={openConflictsCount}
        isPending={publishMutation.isPending}
      />
    </div>
  );
};
