import React from 'react';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';
import { useOrg } from '../org/OrgContext';

export const AdminHome = () => {
  const { activeOrganization, currentMembership, activeModules } = useOrg();
  
  const displayName = currentMembership?.email?.split('@')[0] || 'Admin';

  // Mock checklist logic - in a real app this would be driven by backend state
  const checklist = [
    { id: 'org', label: 'Verify workspace details', done: true },
    { id: 'modules', label: 'Activate initial modules', done: activeModules?.length > 0 },
    { id: 'team', label: 'Invite your team', done: false },
    { id: 'billing', label: 'Configure billing method', done: false }
  ];
  
  const progress = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24">
      
      {/* Strict Control Panel Header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#2F9E8F] animate-pulse-teal"></span>
            <span className="font-medium text-xs text-on-surface-variant">System active</span>
          </div>
          <h1 className="text-3xl font-display-md text-on-surface font-bold">Welcome back, {displayName}</h1>
          <p className="text-on-surface-variant font-body-md mt-1">High-level overview for {activeOrganization?.name}.</p>
        </div>
        
        {/* Setup Progress Widget */}
        <div className="bg-surface-container border border-outline-variant p-4 rounded-sm w-full md:w-80 flex-shrink-0">
          <div className="flex items-center justify-between mb-3 border-b border-outline-variant/30 pb-2">
             <span className="font-medium text-xs text-on-surface-variant">Setup checklist</span>
             <span className="font-mono text-xs text-[#E8A23C]">{progress}%</span>
          </div>
          <div className="space-y-2">
            {checklist.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className={`w-4 h-4 border rounded-sm flex items-center justify-center flex-shrink-0 transition-colors ${item.done ? 'bg-[#2F9E8F] border-[#2F9E8F]' : 'border-outline-variant bg-surface'}`}>
                  {item.done && <span className="material-symbols-outlined text-[12px] text-white">check</span>}
                </div>
                <span className={`text-sm font-medium truncate ${item.done ? 'text-on-surface-variant line-through opacity-50' : 'text-on-surface'}`}>
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
