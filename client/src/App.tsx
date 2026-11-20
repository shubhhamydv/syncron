import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { RosterPage } from './pages/RosterPage';
import { ConflictCenterPage } from './pages/ConflictCenterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TeamPage } from './pages/TeamPage';
import { BrandsPage } from './pages/BrandsPage';

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
              <Route path="roster" element={<RosterPage />} />
              <Route path="conflicts" element={<ConflictCenterPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="brands" element={<BrandsPage />} />
              <Route path="*" element={<Navigate to="/roster?month=12&year=2026" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
