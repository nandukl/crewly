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
  const [visitedTabs, setVisitedTabs] = useState(() => {
    const saved = localStorage.getItem('crewly_visited_tabs');
    return saved ? new Set(JSON.parse(saved)) : new Set(['home']);
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('crewly_visited_tabs', JSON.stringify(Array.from(visitedTabs)));
  }, [visitedTabs]);

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
    <div className="flex h-screen bg-surface-container font-body-md selection:bg-primary/30 overflow-hidden">
      
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-[56px] bg-white border-b border-outline-variant shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-1 mr-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined text-lg">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-lg">widgets</span>
            </div>
            <span className="font-display-sm text-sm text-on-surface font-bold hidden md:block tracking-tight">
              {isTenant ? activeOrganization?.name : 'Crewly'}
            </span>
          </div>
          <OrgSwitcher />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mock notification bell */}
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors relative">
             <span className="material-symbols-outlined text-[20px]">notifications</span>
             <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-error rounded-full"></span>
          </button>
          
          <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-surface-container transition-colors border border-transparent hover:border-outline-variant">
            <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
              {currentMembership?.email?.charAt(0).toUpperCase()}
            </div>
          </button>
        </div>
      </header>

      {/* Locked/Grace Period Banner */}
      {subscriptionStatus && subscriptionStatus !== 'active' && (
        <div className="fixed top-[56px] left-0 w-full z-40">
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

      {/* Main Layout Container */}
      <div className={`flex flex-1 mt-[56px] w-full ${subscriptionStatus && subscriptionStatus !== 'active' ? 'pt-12' : ''}`}>
        
        {/* Sidebar */}
        <aside 
          className={`
            fixed md:sticky top-[56px] left-0 h-[calc(100vh-56px)] 
            w-[240px] bg-white border-r border-outline-variant z-40 
            flex flex-col transition-transform duration-300 ease-in-out shadow-sm
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div className="p-6 flex flex-col gap-4 border-b border-outline-variant/50">
            <div className="flex items-center gap-3">
              <OrgLogo logoUrl={activeOrganization?.logo_url} alt="Org" className="w-10 h-10 bg-surface-container border border-outline-variant flex-shrink-0 object-cover rounded-xl shadow-sm" />
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm text-on-surface truncate tracking-tight">{activeOrganization?.name || 'Workspace'}</span>
                {!isTenant && <span className="text-xs text-current-teal font-medium truncate mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current-teal animate-pulse"></span> Active
                </span>}
              </div>
            </div>
            
            {!isTenant && activeOrganization?.slug && (
              <a 
                href={window.location.hostname === 'localhost' ? `http://${activeOrganization.slug}.localhost:5173` : `https://${activeOrganization.slug}.crewly.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 p-3 bg-surface-container-lowest border border-outline-variant hover:border-outline hover:shadow-sm transition-all rounded-xl flex items-center justify-between group"
                title="Open workspace"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface mb-0.5">Open workspace</span>
                  <span className="text-[11px] text-on-surface-variant font-medium truncate group-hover:text-primary transition-colors">{activeOrganization.slug}.crewly.com</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">open_in_new</span>
              </a>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-hide">
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
                    setVisitedTabs(prev => new Set(prev).add(tab.id));
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 transition-all duration-200 rounded-xl group ${
                    isActive 
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm' 
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                      {icon}
                    </span>
                    <span className="text-sm mt-0.5">{tab.label}</span>
                  </div>
                  {tab.isModule && !visitedTabs.has(tab.id) && (
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-outline-variant/50">
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error-container transition-colors group"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">logout</span>
              <span className="mt-0.5">Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className={`flex-1 flex flex-col min-h-full overflow-y-auto bg-surface p-6 md:p-10 ${isMobileMenuOpen ? 'hidden md:block' : ''}`}>
          <div className="w-full max-w-7xl mx-auto pb-24 h-full flex flex-col">
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
            
            {/* Placeholders for inactive/unimplemented tabs */}
            {!['home', 'settings', 'analytics', 'directory', 'attendance', 'leave', 'payroll', 'performance', 'crm', 'projects', 'helpdesk', 'inventory', 'finance', 'members', 'roles', 'structure', 'marketplace', 'audit', 'billing', 'devtools'].includes(activeTab) && (
                 <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant border border-outline-variant rounded-sm bg-surface-container-lowest">
                   <p className="font-label-md uppercase tracking-widest text-xs">Module Shell</p>
                 </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
