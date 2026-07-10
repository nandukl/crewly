import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from './OrgContext';
import { OrgSwitcher } from './components/OrgSwitcher';
import { OrgProfile } from './OrgProfile';
import { MembershipManagement } from './MembershipManagement';
import { StructureBuilder } from './StructureBuilder';
import { RoleManagement } from '../rbac/RoleManagement';
import { supabase } from '../../lib/supabaseClient';
import { billingService } from '../../lib/billingService';
import BillingStatusBanner from '../billing/components/BillingStatusBanner';
import SuperAdminBillingOverride from '../billing/components/SuperAdminBillingOverride';
import { NotificationBell } from '../notifications/NotificationBell';
import { AuditLogViewer } from '../audit/AuditLogViewer';
import { OrgLogo } from './OrgLogo';
import { EmployeeDirectory } from '../hr/EmployeeDirectory';

import { AttendanceContainer } from '../attendance/AttendanceContainer';
import { LeaveContainer } from '../leave/LeaveContainer';
import { PayrollContainer } from '../payroll/PayrollContainer';
import { PerformanceContainer } from '../performance/PerformanceContainer';
import { CRMContainer } from '../crm/CRMContainer';
import { ProjectsContainer } from '../projects/ProjectsContainer';
import { HelpDeskContainer } from '../helpdesk/HelpDeskContainer';
import { InventoryContainer } from '../inventory/InventoryContainer';
import { FinanceContainer } from '../finance/FinanceContainer';
import { AnalyticsContainer } from '../analytics/AnalyticsContainer';
import { MarketplaceContainer } from '../marketplace/MarketplaceContainer';

export const OrgDashboard = () => {
  const { organizations, activeOrganization, currentMembership, activeModules, loading } = useOrg();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [billingStatus, setBillingStatus] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    supabase.from('user_profiles').select('is_super_admin').single().then(({data}) => {
       setIsSuperAdmin(!!data?.is_super_admin);
    });
  }, []);

  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';

  const allTabs = [
    { id: 'general', label: 'General' },
    ...(isAdmin ? [{ id: 'analytics', label: 'Analytics' }] : []),
    { id: 'directory', label: 'Directory' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'leave', label: 'Leave' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'performance', label: 'Performance' },
    { id: 'crm', label: 'CRM' },
    { id: 'projects', label: 'Projects' },
    { id: 'helpdesk', label: 'Help Desk' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'finance', label: 'Finance & Expenses' },
    { id: 'members', label: 'Access & Invites' },
    ...(isAdmin ? [{ id: 'roles', label: 'Custom Roles' }] : []),
    { id: 'structure', label: 'Structure' },
    ...(isAdmin ? [{ id: 'marketplace', label: 'Marketplace' }] : []),
    ...(isAdmin ? [{ id: 'audit', label: 'Audit Logs' }] : []),
    ...(isSuperAdmin ? [{ id: 'devtools', label: 'Dev Tools (Billing)' }] : [])
  ];

  // Filter tabs based on activeModules from the context
  const OPTIONAL_MODULE_KEYS = ['attendance', 'leave', 'payroll', 'performance', 'crm', 'projects', 'helpdesk', 'inventory', 'finance'];
  
  const tabs = allTabs.filter(tab => {
    if (OPTIONAL_MODULE_KEYS.includes(tab.id)) {
      // Only show if the module is active, OR if we don't have activeModules loaded yet (default true)
      return !activeModules || activeModules.includes(tab.id);
    }
    return true; // Always show core tabs (General, Directory, Settings, etc)
  });

  useEffect(() => {
    if (!loading && organizations.length === 0) {
      navigate('/onboarding');
    }
  }, [organizations, loading, navigate]);

  useEffect(() => {
    if (activeOrganization?.id) {
      billingService.getSubscriptionStatus(activeOrganization.id).then(({ data }) => {
        if (data) setBillingStatus(data.status);
      });
    }
  }, [activeOrganization?.id, activeTab]);

  if (loading) return <div className="p-8">Loading workspace...</div>;
  if (organizations.length === 0) return null;

  return (
    <div className="bg-surface font-body-md text-on-surface overflow-x-hidden min-h-screen">
      {/* TopNavBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-gutter h-[48px] bg-surface-container-lowest border-b border-outline-variant">
        <div className="flex items-center gap-md">
          <span className="font-headline-md text-headline-md font-bold text-on-surface">Crewly</span>
        </div>
        <div className="flex items-center gap-md">
          {isSuperAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              className="text-xs font-bold text-secondary hover:text-blue-700 bg-surface-container-high px-3 py-1.5 rounded-md border border-outline-variant transition-colors"
            >
              Platform Admin
            </button>
          )}
          <div className="flex items-center gap-sm text-secondary">
            <NotificationBell />
            <button onClick={() => supabase.auth.signOut()} className="p-xs hover:bg-surface-container-high rounded-full transition-colors" title="Sign Out">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-[48px] h-[calc(100vh-48px)] w-[240px] z-40 hidden md:flex flex-col pb-md bg-surface border-r border-outline-variant">
        <div className="p-md flex items-center gap-sm border-b border-outline-variant">
          <OrgLogo logoUrl={activeOrganization?.logo_url} alt="Org" className="w-10 h-10 rounded bg-secondary-container flex-shrink-0 object-cover" />
          <div className="flex flex-col overflow-hidden">
            <span className="font-label-md text-label-md font-bold text-on-surface truncate">{activeOrganization?.name || 'Workspace'}</span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest truncate">Enterprise Tier</span>
          </div>
          <span className="material-symbols-outlined ml-auto text-outline-variant cursor-pointer hover:text-on-surface transition-colors">expand_more</span>
        </div>
        
        <nav className="mt-md flex-grow space-y-1 px-sm overflow-y-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            let icon = 'label';
            if (tab.id === 'general') icon = 'business';
            if (tab.id === 'analytics') icon = 'bar_chart';
            if (tab.id === 'directory') icon = 'contacts';
            if (tab.id === 'attendance') icon = 'event_available';
            if (tab.id === 'leave') icon = 'event_busy';
            if (tab.id === 'payroll') icon = 'payments';
            if (tab.id === 'performance') icon = 'trending_up';
            if (tab.id === 'crm') icon = 'handshake';
            if (tab.id === 'projects') icon = 'account_tree';
            if (tab.id === 'helpdesk') icon = 'support_agent';
            if (tab.id === 'inventory') icon = 'inventory_2';
            if (tab.id === 'finance') icon = 'account_balance';
            if (tab.id === 'members') icon = 'groups';
            if (tab.id === 'roles') icon = 'badge';
            if (tab.id === 'structure') icon = 'account_tree';
            if (tab.id === 'marketplace') icon = 'storefront';
            if (tab.id === 'audit') icon = 'history';
            if (tab.id === 'devtools') icon = 'build';

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-md px-md py-sm rounded-lg transition-all ${
                  isActive 
                    ? 'bg-secondary-container text-on-secondary-container border-l-4 border-secondary font-semibold' 
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">{icon}</span>
                <span className="font-label-md text-label-md">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="px-md mt-auto pt-md border-t border-outline-variant">
          <a className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:bg-surface-container rounded-lg transition-all" href="#">
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-md text-label-md">Help Center</span>
          </a>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="md:ml-[240px] mt-[48px] min-h-[calc(100vh-48px)] flex flex-col">
        <div className="p-4 md:p-xl space-y-lg mx-auto w-full">
          {billingStatus && <BillingStatusBanner status={billingStatus} />}
          {activeTab === 'general' && <OrgProfile />}
          {activeTab === 'analytics' && <AnalyticsContainer />}
          {activeTab === 'directory' && <EmployeeDirectory />}
          {activeTab === 'attendance' && <AttendanceContainer />}
          {activeTab === 'leave' && <LeaveContainer />}
          {activeTab === 'payroll' && <PayrollContainer activeOrganization={activeOrganization} />}
          {activeTab === 'performance' && <PerformanceContainer />}
          {activeTab === 'crm' && <CRMContainer />}
          {activeTab === 'projects' && <ProjectsContainer />}
          {activeTab === 'helpdesk' && <HelpDeskContainer />}
          {activeTab === 'inventory' && <InventoryContainer />}
          {activeTab === 'finance' && <FinanceContainer />}
          {activeTab === 'members' && <MembershipManagement />}
          {activeTab === 'roles' && <RoleManagement />}
          {activeTab === 'structure' && <StructureBuilder />}
          {activeTab === 'marketplace' && <MarketplaceContainer />}
          {activeTab === 'audit' && <AuditLogViewer />}
          {activeTab === 'devtools' && <SuperAdminBillingOverride orgId={activeOrganization?.id} />}
        </div>
      </main>
    </div>
  );
};

