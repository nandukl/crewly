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

export const OrgDashboard = () => {
  const { organizations, activeOrganization, currentMembership, loading } = useOrg();
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

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'directory', label: 'Directory' },
    { id: 'members', label: 'Access & Invites' },
    ...(isAdmin ? [{ id: 'roles', label: 'Custom Roles' }] : []),
    { id: 'structure', label: 'Structure' },
    ...(isAdmin ? [{ id: 'audit', label: 'Audit Logs' }] : []),
    ...(isSuperAdmin ? [{ id: 'devtools', label: 'Dev Tools (Billing)' }] : [])
  ];

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
  }, [activeOrganization?.id, activeTab]); // re-fetch status on tab change just in case the dev tool updated it

  if (loading) return <div className="p-8">Loading workspace...</div>;
  if (organizations.length === 0) return null; // Will redirect

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <OrgLogo logoUrl={activeOrganization?.logo_url} alt={activeOrganization?.name || 'Org'} className="h-10 w-10 object-cover rounded-full shadow-sm" />
            <h1 className="text-2xl font-bold text-slate-900">
              {activeOrganization?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <button 
                onClick={() => navigate('/admin')} 
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 transition-colors"
              >
                Platform Admin
              </button>
            )}
            <NotificationBell />
            <OrgSwitcher />
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-500 hover:text-slate-700">Sign Out</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      
      <main className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {billingStatus && <BillingStatusBanner status={billingStatus} />}
          {activeTab === 'general' && <OrgProfile />}
          {activeTab === 'directory' && <EmployeeDirectory />}
          {activeTab === 'members' && <MembershipManagement />}
          {activeTab === 'roles' && <RoleManagement />}
          {activeTab === 'structure' && <StructureBuilder />}
          {activeTab === 'audit' && <AuditLogViewer />}
          {activeTab === 'devtools' && <SuperAdminBillingOverride orgId={activeOrganization?.id} />}
        </div>
      </main>
    </div>
  );
};
