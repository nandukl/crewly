import React from 'react';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';
import { useOrg } from '../org/OrgContext';

export const AdminHome = () => {
  const { activeOrganization, currentMembership, activeModules } = useOrg();
  
  const displayName = currentMembership?.email?.split('@')[0] || 'Admin';

  const checklist = [
    { id: 'org', label: 'Verify workspace details', done: true },
    { id: 'modules', label: 'Activate initial modules', done: activeModules?.length > 0 },
    { id: 'team', label: 'Invite your team', done: false },
    { id: 'billing', label: 'Configure billing method', done: false }
  ];
  
  const progress = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24">
      
      {/* Header */}
      <div className="bg-white border border-outline-variant shadow-sm rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Soft background gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 bg-surface-container px-3 py-1 rounded-full w-fit">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></span>
            <span className="font-semibold text-xs text-on-surface-variant">System active</span>
          </div>
          <h1 className="text-4xl font-display-md text-on-surface font-bold tracking-tight">Welcome back, {displayName}</h1>
          <p className="text-on-surface-variant font-body-md mt-2 text-lg">High-level overview for {activeOrganization?.name}.</p>
        </div>
        
        {/* Setup Progress Widget */}
        <div className="bg-white/50 backdrop-blur-sm border border-outline-variant shadow-sm p-5 rounded-2xl w-full md:w-80 flex-shrink-0 relative z-10">
          <div className="flex items-center justify-between mb-4">
             <span className="font-bold text-sm text-on-surface">Setup checklist</span>
             <span className="font-bold text-sm text-primary">{progress}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-surface-container rounded-full mb-4 overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="space-y-3">
            {checklist.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${item.done ? 'bg-[#10B981] text-white' : 'border border-outline-variant bg-surface-container text-transparent'}`}>
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <span className={`text-sm font-medium truncate transition-colors ${item.done ? 'text-on-surface-variant line-through opacity-70' : 'text-on-surface'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <AnalyticsDashboard />
    </div>
  );
};
