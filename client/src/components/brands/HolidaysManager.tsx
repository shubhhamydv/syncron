import React, { useState } from 'react';
import { PublicHoliday, api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import { formatWeekdayDate } from '@/lib/dates';

interface HolidaysManagerProps {
  holidays: PublicHoliday[];
  onSuccess: () => void;
}

export const HolidaysManager: React.FC<HolidaysManagerProps> = ({
  holidays,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState('2026-12-25');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('National');
  const [isPending, setIsPending] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsPending(true);
    try {
      await api.createPublicHoliday({ date, name, region });
      showToast({
        type: 'success',
        title: 'Public Holiday Added',
        message: `${name} on ${date} added successfully.`,
      });
      setShowAdd(false);
      setName('');
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'Could not add public holiday.',
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this public holiday?')) return;
    try {
      await api.deletePublicHoliday(id);
      showToast({
        type: 'success',
        title: 'Holiday Deleted',
        message: 'Public holiday removed from calendar.',
      });
      onSuccess();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Public Holidays Calendar</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operating rules reference these dates to determine holiday branch closures or premium shifts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAdd ? 'Cancel' : 'Add Public Holiday'}</span>
        </button>
      </div>

      {/* Add Holiday Form */}
      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="p-5 bg-slate-50 rounded-xl border border-indigo-200 space-y-4 shadow-inner"
        >
          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
            Add Public Holiday
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Holiday Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Holiday Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Christmas Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Jurisdiction / Region
              </label>
              <input
                type="text"
                required
                placeholder="e.g. National, Regional"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
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
              {isPending ? 'Saving...' : 'Add Holiday'}
            </button>
          </div>
        </form>
      )}

      {/* Holidays List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {holidays.map((h) => (
          <div
            key={h.id}
            className="p-4 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>{h.name}</span>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {formatWeekdayDate(h.date)}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="w-3 h-3" />
                <span>{h.region}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDelete(h.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete holiday"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
