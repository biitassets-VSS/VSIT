import React from 'react';
import StaffDashboardClient from './StaffDashboardClient';

// Force Next.js and Vercel to completely skip the build-cache
// and fetch live, real-time metrics on every view.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function StaffDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back! Track your assigned hardware and submit active asset inspections.
        </p>
      </div>

      {/* Renders your crash-proof real-time metrics container */}
      <StaffDashboardClient initialAssets={[]} />
    </div>
  );
}