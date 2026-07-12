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
import { EmployeeHome } from '../hr/EmployeeHome';
import { AdminHome } from '../tenant/AdminHome';

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
import { BillingDashboard } from '../billing/BillingDashboard';

export const OrgDashboard = () => {
  const { organizations, activeOrganization, currentMembership, activeModules, loading, isTenant, subscriptionStatus } = useOrg();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.from('user_profiles').select('is_super_admin').single().then(({data}) => {
       setIsSuperAdmin(!!data?.is_super_admin);
    });
  }, []);

  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';
  const isOwner = currentMembership?.role === 'owner';
  const isManager = currentMembership?.role === 'manager';
  
  const canSeeAnalytics = isAdmin || isManager;
  const canSeeDirectory = isAdmin || isManager;

  const allTabs = [
    { id: 'home', label: 'Home' },
    ...(canSeeAnalytics ? [{ id: 'analytics', label: 'Analytics' }] : []),
    ...(canSeeDirectory ? [{ id: 'directory', label: 'Directory' }] : []),
    { id: 'attendance', label: 'Attendance' },
    { id: 'leave', label: 'Leave' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'performance', label: 'Performance' },
    { id: 'crm', label: 'CRM' },
    { id: 'projects', label: 'Projects' },
    { id: 'helpdesk', label: 'Help Desk' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'finance', label: 'Finance & Expenses' },
    ...(isAdmin ? [{ id: 'members', label: 'Access & Invites' }] : []),
    ...(isAdmin ? [{ id: 'roles', label: 'Custom Roles' }] : []),
    ...(isAdmin ? [{ id: 'structure', label: 'Structure' }] : []),
    ...(isAdmin ? [{ id: 'marketplace', label: 'App Modules' }] : []),
    ...(isAdmin ? [{ id: 'audit', label: 'Audit Logs' }] : []),
    ...(isAdmin ? [{ id: 'settings', label: 'Org Settings' }] : []),
    ...(isOwner ? [{ id: 'billing', label: 'Billing & Subscription' }] : [])
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
    if (!loading && organizations.length === 0 && !isTenant) {
      navigate('/onboarding');
    }
  }, [organizations, loading, navigate, isTenant]);

  if (loading) return <div className="p-8">Loading workspace...</div>;
  if (organizations.length === 0) {
    if (isTenant) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center font-body-md">
          <div className="text-center p-xl bg-surface-container-low rounded-2xl shadow-sm border border-outline-variant max-w-md">
            <span className="material-symbols-outlined text-[64px] text-error mb-4">person_off</span>
            <h1 className="font-headline-sm text-on-surface">Access Denied</h1>
            <p className="text-on-surface-variant mt-2">You do not have an active membership in this workspace. If your account was just created, please check your email or ask an admin to approve your account.</p>
            <button onClick={() => supabase.auth.signOut()} className="mt-8 px-6 py-3 bg-primary text-on-primary rounded-lg font-bold shadow-sm hover:bg-primary/90 transition-colors">Sign Out</button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-surface font-body-md text-on-surface overflow-x-hidden min-h-screen">
      {/* TopNavBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-gutter h-[48px] bg-surface-container-lowest border-b border-outline-variant">
        <div className="flex items-center gap-sm md:gap-md">
          <button 
            className="md:hidden p-1 mr-2 text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
          <span className="font-headline-md text-headline-md font-bold text-on-surface mr-4 hidden md:block">{isTenant ? activeOrganization?.name : 'Crewly'}</span>
          <OrgSwitcher />
        </div>
        <div className="flex items-center gap-sm md:gap-md">
          <div className="flex items-center gap-sm text-secondary">
            <NotificationBell />
            <button onClick={() => supabase.auth.signOut()} className="p-xs hover:bg-surface-container-high rounded-full transition-colors" title="Sign Out">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SideNavBar */}
      <aside className={`fixed left-0 top-[48px] h-[calc(100vh-48px)] w-[240px] z-40 flex flex-col pb-md bg-surface border-r border-outline-variant transform transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-md flex flex-col gap-md border-b border-outline-variant">
          <div className="flex items-center gap-sm">
            <OrgLogo logoUrl={activeOrganization?.logo_url} alt="Org" className="w-10 h-10 rounded bg-secondary-container flex-shrink-0 object-cover" />
            <div className="flex flex-col overflow-hidden">
              <span className="font-label-md text-label-md font-bold text-on-surface truncate">{activeOrganization?.name || 'Workspace'}</span>
              {!isTenant && <span className="text-[10px] text-on-surface-variant uppercase tracking-widest truncate">Enterprise Tier</span>}
            </div>
            {!isTenant && <span className="material-symbols-outlined ml-auto text-outline-variant cursor-pointer hover:text-on-surface transition-colors">expand_more</span>}
          </div>
          
          {!isTenant && activeOrganization?.slug && (
            <div className="p-2 bg-surface-container-low rounded-md border border-outline-variant flex flex-col gap-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tenant Portal Link</span>
              <a 
                href={window.location.hostname === 'localhost' ? `http://${activeOrganization.slug}.localhost:5173` : `https://${activeOrganization.slug}.crewly.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-secondary hover:text-primary transition-colors flex items-center gap-1 truncate font-medium"
                title="Click to open your employee login portal"
              >
                <span className="truncate">{window.location.hostname === 'localhost' ? `${activeOrganization.slug}.localhost:5173` : `${activeOrganization.slug}.crewly.com`}</span>
                <span className="material-symbols-outlined text-[14px] ml-auto flex-shrink-0">open_in_new</span>
              </a>
            </div>
          )}
        </div>
        
        <nav className="mt-md flex-grow space-y-1 px-sm overflow-y-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            let icon = 'label';
            if (tab.id === 'home') icon = 'home';
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
            if (tab.id === 'settings') icon = 'settings';
            if (tab.id === 'billing') icon = 'credit_card';

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false); // Close menu on mobile after selection
                }}
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
      <main className="flex-1 ml-0 md:ml-64 mt-[48px] p-4 md:p-8 bg-surface overflow-y-auto">
        <div className="max-w-7xl mx-auto pb-24">
          {subscriptionStatus && <BillingStatusBanner status={subscriptionStatus} />}
          {activeTab === 'home' && (isAdmin ? <AdminHome /> : <EmployeeHome />)}
          {activeTab === 'settings' && <OrgProfile />}
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
          {activeTab === 'billing' && <BillingDashboard />}
          {activeTab === 'devtools' && <SuperAdminBillingOverride orgId={activeOrganization?.id} />}
        </div>
      </main>
    </div>
  );
};

