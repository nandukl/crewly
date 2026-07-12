import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';

const AVAILABLE_MODULES = [
  { id: 'attendance', name: 'Attendance', icon: 'event_available', desc: 'Track clock-ins, timesheets, and presence.' },
  { id: 'leave', name: 'Leave Management', icon: 'event_busy', desc: 'Manage time off requests, policies, and balances.' },
  { id: 'payroll', name: 'Payroll', icon: 'payments', desc: 'Run compensation cycles and generate payslips.' },
  { id: 'performance', name: 'Performance', icon: 'trending_up', desc: 'Manage goals, 1-on-1s, and review cycles.' },
  { id: 'crm', name: 'CRM', icon: 'handshake', desc: 'Track leads, accounts, contacts, and deal pipelines.' },
  { id: 'projects', name: 'Projects', icon: 'account_tree', desc: 'Manage tasks, milestones, and project delivery.' },
  { id: 'helpdesk', name: 'Help Desk', icon: 'support_agent', desc: 'Internal or external support ticketing.' },
  { id: 'inventory', name: 'Inventory', icon: 'inventory_2', desc: 'Track items, stock levels, and warehouse locations.' },
  { id: 'finance', name: 'Finance & Expenses', icon: 'account_balance', desc: 'Manage AR, AP, and the General Ledger.' },
];

export const MarketplaceContainer = () => {
  const { activeOrganization, activeModules, refreshModules, currentMembership } = useOrg();
  const [loading, setLoading] = useState(false);

  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';

  if (!isAdmin) {
    return (
      <div className="p-xl text-center">
        <span className="material-symbols-outlined text-[64px] text-on-surface-variant opacity-50 mb-4">storefront</span>
        <h2 className="font-headline-sm text-on-surface">App Marketplace</h2>
        <p className="text-on-surface-variant mt-2">Only Organization Administrators can install or remove modules.</p>
      </div>
    );
  }

  const handleToggle = async (moduleId, currentlyActive) => {
    setLoading(true);
    try {
      if (currentlyActive) {
        // Deactivate: set is_active=false
        await supabase
          .from('org_module_activations')
          .update({ is_active: false })
          .match({ organization_id: activeOrganization.id, module_key: moduleId });
      } else {
        // Activate: insert row
        await supabase
          .from('org_module_activations')
          .upsert({ organization_id: activeOrganization.id, module_key: moduleId, is_active: true });
      }
      // Refresh the context so the sidebar updates instantly
      await refreshModules();
    } catch (err) {
      console.error("Error toggling module:", err);
      alert("Failed to update module status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] space-y-xl">
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">App Modules</h2>
        <p className="text-on-surface-variant font-body-md mt-1">
          Customize your workspace. Turn on the tools your team needs and turn off the ones they don't.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {AVAILABLE_MODULES.map(mod => {
          const isActive = activeModules.includes(mod.id);
          
          return (
            <div key={mod.id} className={`bg-surface-container-lowest p-lg rounded-xl shadow-sm border transition-all ${isActive ? 'border-primary' : 'border-outline-variant opacity-80'}`}>
              <div className="flex justify-between items-start mb-md">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary-container text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-[28px]">{mod.icon}</span>
                </div>
                <button 
                  onClick={() => handleToggle(mod.id, isActive)}
                  disabled={loading}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    isActive 
                      ? 'bg-primary text-on-primary hover:bg-primary/90' 
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  {isActive ? 'Installed' : 'Install'}
                </button>
              </div>
              
              <h3 className="font-title-md font-bold text-on-surface">{mod.name}</h3>
              <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
                {mod.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
