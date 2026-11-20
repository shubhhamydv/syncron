import React from 'react';
import { EntryStatusType, ConflictTypeEnum } from '@/lib/api';

interface StatusBadgeProps {
  status: EntryStatusType | ConflictTypeEnum | string;
  className?: string;
  brandCode?: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  brandCode,
  label,
}) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let displayLabel = label || status;

  switch (status) {
    case 'WORKING':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium';
      displayLabel = brandCode ? `${brandCode} • Working` : 'Working';
      break;
    case 'WEEKLY_OFF':
      badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
      displayLabel = 'Weekly Off';
      break;
    case 'LEAVE':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-300 font-medium';
      displayLabel = 'Leave';
      break;
    case 'COMP_OFF':
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-300 font-medium';
      displayLabel = 'Comp Off';
      break;
    case 'HOLIDAY_OFF':
      badgeStyle = 'bg-sky-50 text-sky-700 border-sky-300';
      displayLabel = 'Holiday Off';
      break;
    case 'NOT_SCHEDULED':
      badgeStyle = 'bg-stone-100 text-stone-500 border-stone-200';
      displayLabel = 'Not Scheduled';
      break;
    case 'COVERAGE_GAP':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
      displayLabel = 'Coverage Gap';
      break;
    case 'INSUFFICIENT_STAFF':
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      displayLabel = 'Insufficient Staff';
      break;
    case 'OVERLAP':
      badgeStyle = 'bg-purple-50 text-purple-800 border-purple-300 font-semibold';
      displayLabel = 'Overlap Conflict';
      break;
    case 'LEAVE_CONFLICT':
      badgeStyle = 'bg-rose-100 text-rose-900 border-rose-400 font-semibold';
      displayLabel = 'Leave Conflict';
      break;
    case 'PREFERENCE_VIOLATION':
      badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
      displayLabel = 'Preference Warning';
      break;
    case 'OK':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      displayLabel = 'OK';
      break;
    case 'GAP':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-300 font-medium';
      displayLabel = 'GAP';
      break;
    case 'PARTIAL':
      badgeStyle = 'bg-orange-50 text-orange-700 border-orange-200 font-medium';
      displayLabel = 'PARTIAL';
      break;
    case 'DRAFT':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      displayLabel = 'DRAFT';
      break;
    case 'PUBLISHED':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      displayLabel = 'PUBLISHED';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${badgeStyle} ${className}`}
    >
      {displayLabel}
    </span>
  );
};
