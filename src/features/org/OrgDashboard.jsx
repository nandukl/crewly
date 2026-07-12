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

  const OPTIONAL_MODULE_KEYS = ['attendance', 'leave', 'payroll', 'performance', 'crm', 'projects', 'helpdesk', 'inventory', 'finance'];

  const allTabs = [
    { id: 'home', label: 'Dashboard' },
    ...(canSeeAnalytics ? [{ id: 'analytics', label: 'Analytics' }] : []),
    ...(canSeeDirectory ? [{ id: 'directory', label: 'Directory' }] : []),
    { id: 'attendance', label: 'Attendance', isModule: true },
    { id: 'leave', label: 'Leave', isModule: true },
    { id: 'payroll', label: 'Payroll', isModule: true },
    { id: 'performance', label: 'Performance', isModule: true },
    { id: 'crm', label: 'CRM', isModule: true },
    { id: 'projects', label: 'Projects', isModule: true },
    { id: 'helpdesk', label: 'Help Desk', isModule: true },
    { id: 'inventory', label: 'Inventory', isModule: true },
    { id: 'finance', label: 'Finance', isModule: true },
    ...(isAdmin ? [{ id: 'members', label: 'Team & Roles' }] : []),
    ...(isAdmin ? [{ id: 'structure', label: 'Structure' }] : []),
    ...(isAdmin ? [{ id: 'marketplace', label: 'Marketplace' }] : []),
    ...(isAdmin ? [{ id: 'audit', label: 'Audit Log' }] : []),
    ...(isAdmin ? [{ id: 'settings', label: 'Settings' }] : []),
    ...(isOwner ? [{ id: 'billing', label: 'Billing' }] : [])
  ];
  
  const tabs = allTabs.filter(tab => {
    if (tab.isModule) {
      return !activeModules || activeModules.includes(tab.id);
    }
    return true; 
  });

  useEffect(() => {
    if (!loading && organizations.length === 0 && !isTenant) {
      navigate('/onboarding');
    }
  }, [organizations, loading, navigate, isTenant]);

  if (loading) return <div className="p-8 font-mono text-[#E8A23C]">Loading workspace...</div>;
  if (organizations.length === 0) {
    if (isTenant) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center font-body-md">
          <div className="text-center p-8 bg-surface-container-lowest border border-outline-variant max-w-md rounded-sm">
            <span className="material-symbols-outlined text-[64px] text-[#C4453A] mb-4">person_off</span>
            <h1 className="font-display-md text-white text-2xl mb-2">Access Denied</h1>
            <p className="text-on-surface-variant font-mono text-sm mb-8">No active membership found.</p>
            <button onClick={() => supabase.auth.signOut()} className="w-full py-3 bg-surface-container border border-outline-variant hover:border-outline text-white font-medium rounded-sm transition-colors">Sign Out</button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-surface font-body-md text-on-surface overflow-x-hidden min-h-screen flex flex-col">
      {/* TopNavBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-[48px] bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-1 mr-2 text-on-surface-variant hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined text-lg">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
          <span className="font-display-sm text-sm text-white font-bold hidden md:block">
            {isTenant ? activeOrganization?.name : 'Crewly'}
          </span>
          <OrgSwitcher />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <NotificationBell />
            <div className="h-4 w-px bg-outline-variant"></div>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 hover:text-white transition-colors" title="Sign Out">
              <span className="font-medium text-xs hidden sm:block">Sign out</span>
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Locked/Grace Period Banner */}
      {subscriptionStatus && (
        <div className="fixed top-[48px] left-0 w-full z-40">
          <BillingStatusBanner status={subscriptionStatus} />
        </div>
      )}

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#14161A]/80 z-30 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-1 mt-[48px]">
        {/* SideNavBar - Strict #14161A Graphite Panel */}
        <aside className={`fixed left-0 top-[48px] h-[calc(100vh-48px)] w-[240px] z-40 flex flex-col pb-6 bg-[#14161A] border-r border-[#2A2C30] transform transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex flex-col gap-4 border-b border-[#2A2C30]">
            <div className="flex items-center gap-3">
              <OrgLogo logoUrl={activeOrganization?.logo_url} alt="Org" className="w-8 h-8 bg-[#1A1C20] border border-[#2A2C30] flex-shrink-0 object-cover rounded-sm" />
              <div className="flex flex-col overflow-hidden">
                <span className="font-medium text-sm text-white truncate">{activeOrganization?.name || 'Workspace'}</span>
                {!isTenant && <span className="text-xs text-[#2F9E8F] truncate mt-0.5">Active</span>}
              </div>
            </div>
            
            {!isTenant && activeOrganization?.slug && (
              <a 
                href={window.location.hostname === 'localhost' ? `http://${activeOrganization.slug}.localhost:5173` : `https://${activeOrganization.slug}.crewly.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 p-2 bg-[#1A1C20] border border-[#2A2C30] hover:border-[#3A3C40] transition-colors rounded-sm flex items-center justify-between group"
                title="Open workspace"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-white/50 mb-1">Open workspace</span>
                  <span className="text-[11px] text-white/80 font-mono truncate">{activeOrganization.slug}.crewly.com</span>
                </div>
                <span className="material-symbols-outlined text-[14px] text-white/50 group-hover:text-white">open_in_new</span>
              </a>
            )}
          </div>
          
          <nav className="mt-6 flex-grow space-y-1 px-3 overflow-y-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              let icon = 'label';
              if (tab.id === 'home') icon = 'home';
              if (tab.id === 'analytics') icon = 'bar_chart';
              if (tab.id === 'directory') icon = 'contacts';
              if (tab.id === 'attendance') icon = 'schedule';
              if (tab.id === 'leave') icon = 'event_available';
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
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 transition-colors rounded-sm group ${
                    isActive 
                      ? 'bg-[#1F2125] text-white' 
                      : 'text-white/60 hover:bg-[#1A1C20] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    <span className="text-sm font-medium mt-0.5">{tab.label}</span>
                  </div>
                  {tab.isModule && (
                    <div className="flex items-center justify-center w-4 h-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E8A23C] shadow-[0_0_8px_rgba(232,162,60,0.4)]"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
          
          <div className="px-6 mt-auto pt-6 border-t border-[#2A2C30]">
            <a className="flex items-center gap-3 py-2 text-white/50 hover:text-white transition-colors text-sm font-medium" href="#">
              <span className="material-symbols-outlined text-[16px]">help</span>
              <span>Support</span>
            </a>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className={`flex-1 ml-0 md:ml-[240px] p-6 md:p-10 bg-surface overflow-y-auto ${subscriptionStatus ? 'mt-12' : ''}`}>
          <div className="max-w-7xl mx-auto pb-24">
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
    </div>
  );
};
