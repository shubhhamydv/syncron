import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import { Brand, api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  brand: Brand | null;
}

export const BrandModal: React.FC<BrandModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  brand,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setStatus(brand.status);
    } else {
      setName('');
      setStatus('ACTIVE');
    }
  }, [brand]);

  if (!isOpen) return null;

  const isEditing = !!brand;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      if (isEditing) {
        await api.updateBrand(brand.id, { name, status });
        showToast({
          type: 'success',
          title: 'Brand Updated',
          message: `${name} updated successfully.`,
        });
      } else {
        await api.createBrand({ name, status });
        showToast({
          type: 'success',
          title: 'Brand Created',
          message: `${name} has been added.`,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not save brand.',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>{isEditing ? 'Edit Brand' : 'Add New Client Brand'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brand Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kalyan Organics"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : isEditing ? 'Update Brand' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
