import React from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { HealthBanner } from '../common/HealthBanner';

export const AppLayout: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Extract month and year from URL or default to December 2026
  const month = parseInt(searchParams.get('month') || '12', 10);
  const year = parseInt(searchParams.get('year') || '2026', 10);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Health Alert Banner (visible when API is down) */}
      <HealthBanner />

      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar month={month} year={year} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav month={month} year={year} />

          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet context={{ month, year }} />
          </main>
        </div>
      </div>
    </div>
  );
};
