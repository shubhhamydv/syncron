import React, { useState } from 'react';
import { OperatingRule, CoverageRequirement, Brand, Process, api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Save, Calendar, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface OperatingRulesEditorProps {
  brands: Brand[];
  processes: Process[];
  operatingRules: OperatingRule[];
  coverageRequirements: CoverageRequirement[];
  onSuccess: () => void;
}

export const OperatingRulesEditor: React.FC<OperatingRulesEditorProps> = ({
  brands,
  processes,
  operatingRules,
  coverageRequirements,
  onSuccess,
}) => {
  const { showMutationToast, showToast } = useToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // State for date/weekday overrides
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideBrandId, setOverrideBrandId] = useState(brands[0]?.id || '');
  const [overrideProcessId, setOverrideProcessId] = useState(processes[0]?.id || '');
  const [overrideType, setOverrideType] = useState<'date' | 'weekday'>('date');
  const [overrideDate, setOverrideDate] = useState('2026-12-15');
  const [overrideWeekday, setOverrideWeekday] = useState(0);
  const [overrideStaff, setOverrideStaff] = useState(2);
  const [isPendingOverride, setIsPendingOverride] = useState(false);

  // Local state for edits
  // Map key: "brandId_processId"
  const [localRules, setLocalRules] = useState<
    Record<
      string,
      {
        ruleId?: string;
        workingDays: number[];
        operatesOnPublicHolidays: boolean;
        reqId?: string;
        minimumStaff: number;
      }
    >
  >(() => {
    const state: Record<string, any> = {};
    for (const rule of operatingRules) {
      const key = `${rule.brandId}_${rule.processId}`;
      const req = coverageRequirements.find(
        (r) => r.brandId === rule.brandId && r.processId === rule.processId
      );
      state[key] = {
        ruleId: rule.id,
        workingDays: [...rule.workingDays],
        operatesOnPublicHolidays: rule.operatesOnPublicHolidays,
        reqId: req?.id,
        minimumStaff: req?.minimumStaff ?? 1,
      };
    }
    return state;
  });

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPendingOverride(true);
    try {
      const payload: any = {
        brandId: overrideBrandId,
        processId: overrideProcessId,
        minimumStaff: Number(overrideStaff),
      };
      if (overrideType === 'date') {
        payload.date = overrideDate;
      } else {
        payload.dayOfWeek = Number(overrideWeekday);
      }
      const res = await api.createCoverageRequirement(payload);
      showMutationToast('Staffing override created', res);
      setShowAddOverride(false);
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Override Failed',
        message: err.message || 'Could not create override.',
      });
    } finally {
      setIsPendingOverride(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!window.confirm('Delete this staffing override? Affected draft rosters will re-sync.')) return;
    try {
      const res = await api.deleteCoverageRequirement(id);
      showMutationToast('Override deleted', res);
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message,
      });
    }
  };

  const specificOverrides = coverageRequirements.filter(
    (r) => (r.date !== null && r.date !== undefined) || (r.dayOfWeek !== null && r.dayOfWeek !== undefined)
  );

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleToggleDay = (key: string, day: number) => {
    setLocalRules((prev) => {
      const current = prev[key]?.workingDays || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort();
      return {
        ...prev,
        [key]: {
          ...prev[key],
          workingDays: updated,
        },
      };
    });
  };

  const handleToggleHoliday = (key: string) => {
    setLocalRules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        operatesOnPublicHolidays: !prev[key]?.operatesOnPublicHolidays,
      },
    }));
  };

  const handleChangeStaff = (key: string, staff: number) => {
    setLocalRules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        minimumStaff: Math.max(1, staff),
      },
    }));
  };

  const handleSave = async (brandId: string, processId: string) => {
    const key = `${brandId}_${processId}`;
    const entry = localRules[key];
    if (!entry) return;

    setSavingKey(key);
    try {
      let mutationRes: any = null;

      // Update operating rule
      if (entry.ruleId) {
        await api.updateOperatingRule(entry.ruleId, {
          workingDays: entry.workingDays,
          operatesOnPublicHolidays: entry.operatesOnPublicHolidays,
        });
      } else {
        const newRule = await api.createOperatingRule({
          brandId,
          processId,
          workingDays: entry.workingDays,
          operatesOnPublicHolidays: entry.operatesOnPublicHolidays,
        });
        entry.ruleId = newRule.id;
      }

      // Update coverage requirement (triggers draft roster conflict resync!)
      if (entry.reqId) {
        mutationRes = await api.updateCoverageRequirement(entry.reqId, {
          minimumStaff: entry.minimumStaff,
        });
      } else {
        mutationRes = await api.createCoverageRequirement({
          brandId,
          processId,
          minimumStaff: entry.minimumStaff,
        });
        entry.reqId = (mutationRes as any).requirement?.id;
      }

      showMutationToast('Rules and coverage requirements updated', mutationRes);
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not update rule or requirement.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Brand Operating Rules & Staffing Requirements
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure working day calendars, public holiday operations, and minimum SLA staffing per process.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {operatingRules.map((rule) => {
          const key = `${rule.brandId}_${rule.processId}`;
          const current = localRules[key] || {
            workingDays: rule.workingDays,
            operatesOnPublicHolidays: rule.operatesOnPublicHolidays,
            minimumStaff: 1,
          };
          const isSaving = savingKey === key;

          return (
            <div
              key={rule.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              {/* Brand and Process */}
              <div className="min-w-[200px]">
                <h4 className="font-bold text-slate-900 text-sm">
                  {rule.brand?.name || rule.brandId}
                </h4>
                <div className="text-xs text-indigo-600 font-medium">
                  Process: {rule.process?.name || rule.processId}
                </div>
              </div>

              {/* Working Days Checkboxes */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  Operating Days
                </span>
                <div className="flex items-center gap-1">
                  {dayLabels.map((label, dayNum) => {
                    const isSelected = current.workingDays.includes(dayNum);
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => handleToggleDay(key, dayNum)}
                        className={`w-8 h-7 text-xs font-semibold rounded-md border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-700 text-white shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Public Holiday Toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={current.operatesOnPublicHolidays}
                    onChange={() => handleToggleHoliday(key)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Open on Holidays</span>
                </label>
              </div>

              {/* Minimum Staff */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Min Staff:</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={current.minimumStaff}
                  onChange={(e) => handleChangeStaff(key, parseInt(e.target.value, 10) || 1)}
                  className="w-16 text-center text-xs font-bold font-mono rounded-lg border border-slate-300 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={() => handleSave(rule.brandId, rule.processId)}
                disabled={isSaving}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Rule'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Date & Weekday-Specific Staffing Overrides */}
      <div className="pt-8 border-t border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Date & Weekday-Specific Staffing Overrides
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Targeted SLA staff overrides for peak sales days (e.g. Christmas, flash sales) or recurring weekday surges.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddOverride(!showAddOverride)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 self-start"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddOverride ? 'Cancel' : 'Add Staff Override'}</span>
          </button>
        </div>

        {/* Add Override Form */}
        {showAddOverride && (
          <form onSubmit={handleAddOverride} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 uppercase">New Minimum Staff Override</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Brand</label>
                <select
                  value={overrideBrandId}
                  onChange={(e) => setOverrideBrandId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Process</label>
                <select
                  value={overrideProcessId}
                  onChange={(e) => setOverrideProcessId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Override Type</label>
                <select
                  value={overrideType}
                  onChange={(e) => setOverrideType(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="date">Date Specific (Single Day)</option>
                  <option value="weekday">Weekday Specific (Recurring)</option>
                </select>
              </div>

              {overrideType === 'date' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Recurring Weekday</label>
                  <select
                    value={overrideWeekday}
                    onChange={(e) => setOverrideWeekday(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    {dayLabels.map((name, idx) => (
                      <option key={idx} value={idx}>{idx} - {name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">Required Staff:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={overrideStaff}
                  onChange={(e) => setOverrideStaff(Number(e.target.value))}
                  className="w-20 text-xs font-mono font-bold rounded-lg border border-slate-300 p-1.5 bg-white text-center"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOverride(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPendingOverride}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isPendingOverride ? 'Saving...' : 'Create Override'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Existing Overrides List */}
        {specificOverrides.length === 0 ? (
          <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400">
            No specific date or weekday staffing overrides currently defined.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {specificOverrides.map((ov) => {
              const brandName = brands.find((b) => b.id === ov.brandId)?.name || ov.brandId;
              const procName = processes.find((p) => p.id === ov.processId)?.name || ov.processId;
              return (
                <div
                  key={ov.id}
                  className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300"
                >
                  <div>
                    <span className="font-semibold text-slate-900 text-xs">{brandName} • {procName}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {ov.date ? `Date: ${ov.date}` : `Weekday: ${dayLabels[ov.dayOfWeek ?? 0]}`} | Min Staff: {ov.minimumStaff}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOverride(ov.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete override"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
