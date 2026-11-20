import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const HealthBanner: React.FC = () => {
  const { isError, error, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 20000,
    retry: 1,
  });

  if (!isError) return null;

  return (
    <div className="bg-rose-600 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 text-white animate-pulse" />
        <span>
          <strong>Backend API Unreachable:</strong> Cannot reach {import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}. Ensure the Express server is running.
        </span>
      </div>
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        <span>Retry</span>
      </button>
    </div>
  );
};
