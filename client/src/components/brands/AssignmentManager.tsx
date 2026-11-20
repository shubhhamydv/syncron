import React, { useState } from 'react';
import { Assignment, Employee, Brand, Process, api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Plus, Trash2, Check, UserCheck, Shield } from 'lucide-react';

interface AssignmentManagerProps {
  assignments: Assignment[];
  employees: Employee[];
  brands: Brand[];
  processes: Process[];
  onSuccess: () => void;
}

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  assignments,
  employees,
  brands,
  processes,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [processId, setProcessId] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [search, setSearch] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !brandId || !processId) return;

    setIsPending(true);
    try {
      await api.createAssignment({ employeeId, brandId, processId });
      showToast({
        type: 'success',
        title: 'Assignment Created',
        message: 'Employee assigned to brand and process successfully.',
      });
      setShowAdd(false);
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Assignment Failed',
        message: err.message || 'Could not assign employee.',
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) return;
    try {
      await api.deleteAssignment(id);
      showToast({
        type: 'success',
        title: 'Assignment Removed',
        message: 'Assignment successfully removed.',
      });
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message,
      });
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const empName = a.employee?.name.toLowerCase() || '';
    const brandName = a.brand?.name.toLowerCase() || '';
    const procName = a.process?.name.toLowerCase() || '';
    return empName.includes(q) || brandName.includes(q) || procName.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Process & Brand Assignment Matrix</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Defines which employees are certified and eligible to handle specific brand processes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEmployeeId(employees[0]?.id || '');
            setBrandId(brands[0]?.id || '');
            setProcessId(processes[0]?.id || '');
            setShowAdd(!showAdd);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAdd ? 'Cancel' : 'Add Assignment'}</span>
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="p-5 bg-slate-50 rounded-xl border border-indigo-200 space-y-4 shadow-inner"
        >
          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
            Assign Employee to Brand & Process
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Employee
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Brand
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Process
              </label>
              <select
                value={processId}
                onChange={(e) => setProcessId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="max-w-xs">
        <input
          type="text"
          placeholder="Filter assignments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Brand</th>
              <th className="px-4 py-3 font-semibold">Process</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredAssignments.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  {a.employee?.name || a.employeeId}
                </td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">
                  {a.brand?.name || a.brandId}
                </td>
                <td className="px-4 py-2.5 font-mono text-indigo-700">
                  {a.process?.name || a.processId}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Remove assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
