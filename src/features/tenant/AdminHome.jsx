import React from 'react';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';
import { useOrg } from '../org/OrgContext';

export const AdminHome = () => {
  const { activeOrganization, currentMembership } = useOrg();
  
  const displayName = currentMembership?.email?.split('@')[0] || 'Admin';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-3xl p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-on-primary/80 font-bold tracking-wider uppercase text-sm mb-2">Organization Command Center</p>
          <h1 className="text-4xl md:text-5xl font-headline-lg font-bold mb-2">Welcome back, {displayName}!</h1>
          <p className="text-lg text-on-primary/90 opacity-90">Here is your high-level overview for {activeOrganization?.name}.</p>
        </div>
      </div>
      
      <AnalyticsDashboard />
    </div>
  );
};
