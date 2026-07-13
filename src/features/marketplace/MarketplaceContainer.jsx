import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { ModulePanel } from '../../components/ui/ModulePanel';

const AVAILABLE_MODULES = [
  { id: 'attendance', name: 'Attendance', icon: 'schedule', desc: 'Track clock-ins, timesheets, and presence.', pro: false },
  { id: 'leave', name: 'Leave management', icon: 'event_available', desc: 'Manage time off requests, policies, and balances.', pro: false },
  { id: 'payroll', name: 'Payroll', icon: 'payments', desc: 'Run compensation cycles and generate payslips.', pro: false },
  { id: 'performance', name: 'Performance', icon: 'trending_up', desc: 'Manage goals, 1-on-1s, and review cycles.', pro: false },
  { id: 'crm', name: 'CRM', icon: 'handshake', desc: 'Track leads, accounts, contacts, and deal pipelines.', pro: false },
  { id: 'projects', name: 'Projects', icon: 'account_tree', desc: 'Manage tasks, milestones, and project delivery.', pro: false },
  { id: 'helpdesk', name: 'Help desk', icon: 'support_agent', desc: 'Internal or external support ticketing.', pro: false },
  { id: 'inventory', name: 'Inventory', icon: 'inventory_2', desc: 'Track items, stock levels, and warehouse locations.', pro: false },
  { id: 'finance', name: 'Finance & expenses', icon: 'account_balance', desc: 'Manage AR, AP, and the General Ledger.', pro: true },
];

export const MarketplaceContainer = () => {
  const { activeOrganization, activeModules, refreshModules, currentMembership } = useOrg();
  const [transitioningMods, setTransitioningMods] = useState({});

  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';

  if (!isAdmin) {
    return (
      <div className="p-xl text-center bg-white border border-outline-variant rounded-3xl max-w-2xl mx-auto shadow-sm mt-12">
        <span className="material-symbols-outlined text-[64px] text-primary/50 mb-4">storefront</span>
        <h2 className="font-display-md text-2xl text-on-surface font-bold tracking-tight">App Store</h2>
        <p className="text-on-surface-variant mt-2 font-body-md">Only organization administrators can install or remove apps.</p>
      </div>
    );
  }

  const handleToggle = async (moduleId, currentlyActive) => {
    setTransitioningMods(prev => ({ ...prev, [moduleId]: true }));
    
    // Simulate slight download/install delay
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (currentlyActive) {
        await supabase
          .from('org_module_activations')
          .update({ is_active: false })
          .match({ organization_id: activeOrganization.id, module_key: moduleId });
      } else {
        await supabase
          .from('org_module_activations')
          .upsert({ organization_id: activeOrganization.id, module_key: moduleId, is_active: true });
      }
      await refreshModules();
    } catch (err) {
      console.error("Error toggling module:", err);
      alert("Failed to install app.");
    } finally {
      setTransitioningMods(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  const activeList = AVAILABLE_MODULES.filter(mod => activeModules.includes(mod.id));
  const availableList = AVAILABLE_MODULES.filter(mod => !activeModules.includes(mod.id));

  return (
    <div className="max-w-7xl space-y-12 pb-24">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-3xl border border-primary/10">
        <h2 className="font-display-md text-3xl text-on-surface mb-2 font-bold tracking-tight">App Store</h2>
        <p className="text-on-surface-variant font-body-md max-w-2xl text-base">
          Browse and install powerful apps to extend your workspace. You only pay for what you use.
        </p>
      </div>

      {activeList.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="font-display-md font-bold text-xl text-on-surface tracking-tight">Installed Apps</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeList.map(mod => {
              const isTransitioning = !!transitioningMods[mod.id];
              return (
                <ModulePanel
                  key={mod.id}
                  title={mod.name}
                  description={mod.desc}
                  icon={mod.icon}
                  status="active"
                  interactive={true}
                  isTransitioning={isTransitioning}
                  onToggle={() => handleToggle(mod.id, true)}
                />
              );
            })}
          </div>
        </section>
      )}

      {availableList.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6 mt-12">
            <h3 className="font-display-md font-bold text-xl text-on-surface tracking-tight">Discover Apps</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableList.map(mod => {
              const isTransitioning = !!transitioningMods[mod.id];
              const isLocked = mod.pro; 
              
              return (
                <ModulePanel
                  key={mod.id}
                  title={mod.name}
                  description={mod.desc}
                  icon={mod.icon}
                  status={isLocked ? 'locked' : 'inactive'}
                  interactive={!isLocked}
                  isTransitioning={isTransitioning}
                  onToggle={!isLocked ? () => handleToggle(mod.id, false) : undefined}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
