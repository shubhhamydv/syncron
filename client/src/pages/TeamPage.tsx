import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Employee, Pod, ApiException } from '@/lib/api';
import { PodsList } from '@/components/team/PodsList';
import { SetLeadModal } from '@/components/team/SetLeadModal';
import { EmployeeModal } from '@/components/team/EmployeeModal';
import { AvailabilityDrawer } from '@/components/team/AvailabilityDrawer';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { Users, UserPlus, Search, Calendar, Edit3, Trash2, ShieldCheck, Mail } from 'lucide-react';

export const TeamPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPodId, setSelectedPodId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Drawers state
  const [selectedPodForLead, setSelectedPodForLead] = useState<Pod | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeForAvail, setSelectedEmployeeForAvail] = useState<Employee | null>(null);

  // Queries
  const { data: pods = [], refetch: refetchPods } = useQuery({
    queryKey: ['pods'],
    queryFn: api.getPods,
  });

  const {
    data: employees = [],
    isLoading: isLoadingEmployees,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: ['employees', selectedPodId, selectedStatus, search],
    queryFn: () =>
      api.getEmployees({
        podId: selectedPodId || undefined,
        status: selectedStatus || undefined,
        search: search || undefined,
      }),
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEmployee(id),
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Employee Removed',
        message: 'Employee record successfully deleted.',
      });
      refetchEmployees();
      refetchPods();
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Delete Prevented',
        message: err.message || 'Cannot delete employee with active assignments or shifts.',
      });
    },
  });

  const handleDeleteEmployee = (emp: Employee) => {
    if (window.confirm(`Are you sure you want to delete ${emp.name}?`)) {
      deleteMutation.mutate(emp.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Team & Pod Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Configure employee organizational pods, designated team leads, skill qualification assignments, and approved availability schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingEmployee(null);
            setIsEmployeeModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Pods Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Organizational Pods ({pods.length})
        </h2>
        <PodsList pods={pods} onOpenSetLead={setSelectedPodForLead} />
      </div>

      {/* Employees Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by employee name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Pod filter */}
          <select
            value={selectedPodId}
            onChange={(e) => setSelectedPodId(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Staff</option>
            <option value="INACTIVE">Inactive Staff</option>
          </select>

          {(search || selectedPodId || selectedStatus) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedPodId('');
                setSelectedStatus('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 hover:bg-indigo-50 rounded"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{employees.length}</span> employees
        </div>
      </div>

      {/* Employees Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Pod</th>
              <th className="px-4 py-3 font-semibold">Assigned Brand & Process Skills</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoadingEmployees ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Loading employee directory...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No employees match the selected criteria.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Name & Email */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{emp.name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Mail className="w-3 h-3" />
                      <span>{emp.email}</span>
                    </div>
                  </td>

                  {/* Pod */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                      {emp.pod?.name || 'Unassigned'}
                    </span>
                  </td>

                  {/* Assignments */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {emp.assignments && emp.assignments.length > 0 ? (
                        emp.assignments.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-medium"
                          >
                            <span>{a.brand?.name}</span>
                            <span className="text-indigo-400 font-mono">({a.process?.name})</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No active assignments</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeForAvail(emp)}
                        title="Manage availability and leaves"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Availability</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingEmployee(emp);
                          setIsEmployeeModalOpen(true);
                        }}
                        title="Edit employee"
                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(emp)}
                        title="Delete employee"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Set Lead Modal */}
      <SetLeadModal
        pod={selectedPodForLead}
        onClose={() => setSelectedPodForLead(null)}
        onSuccess={() => {
          refetchPods();
          refetchEmployees();
        }}
        employees={employees}
      />

      {/* Create / Edit Employee Modal */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        onSuccess={() => {
          refetchEmployees();
          refetchPods();
        }}
        employee={editingEmployee}
        pods={pods}
      />

      {/* Availability Drawer */}
      <AvailabilityDrawer
        employee={selectedEmployeeForAvail}
        onClose={() => setSelectedEmployeeForAvail(null)}
        onSuccess={() => {
          refetchEmployees();
          queryClient.invalidateQueries({ queryKey: ['rosters'] });
        }}
      />
    </div>
  );
};
