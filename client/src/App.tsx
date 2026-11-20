import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { Loader2 } from 'lucide-react';

const RosterPage = lazy(() => import('./pages/RosterPage').then((m) => ({ default: m.RosterPage })));
const ConflictCenterPage = lazy(() =>
  import('./pages/ConflictCenterPage').then((m) => ({ default: m.ConflictCenterPage }))
);
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const BrandsPage = lazy(() => import('./pages/BrandsPage').then((m) => ({ default: m.BrandsPage })));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px] text-slate-400">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      <span className="text-xs font-medium">Loading view...</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/roster?month=12&year=2026" replace />} />
              <Route
                path="roster"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <RosterPage />
                  </Suspense>
                }
              />
              <Route
                path="conflicts"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ConflictCenterPage />
                  </Suspense>
                }
              />
              <Route
                path="dashboard"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="team"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <TeamPage />
                  </Suspense>
                }
              />
              <Route
                path="brands"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <BrandsPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/roster?month=12&year=2026" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
