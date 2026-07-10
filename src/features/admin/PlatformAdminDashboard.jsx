import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { OrganizationsTab } from './tabs/OrganizationsTab';
import { SystemUsersTab } from './tabs/SystemUsersTab';
import { GlobalSettingsTab } from './tabs/GlobalSettingsTab';

export const PlatformAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('organizations');
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard', disabled: true },
    { id: 'organizations', label: 'Tenants & Billing', icon: 'business' },
    { id: 'users', label: 'System Users', icon: 'group' },
    { id: 'settings', label: 'Global Settings', icon: 'settings' }
  ];

  return (
    <div className="flex h-screen bg-surface-container overflow-hidden">
      {/* Side Navigation */}
      <aside className="w-[280px] bg-surface-container-lowest border-r border-outline-variant flex flex-col z-20 flex-shrink-0">
        <div className="h-[64px] flex items-center px-lg border-b border-outline-variant">
          <div className="flex items-center gap-sm text-primary">
            <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
            <span className="font-title-lg font-bold tracking-tight">Crewly Admin</span>
          </div>
        </div>

        <div className="flex-1 py-md px-sm overflow-y-auto space-y-1">
          <div className="px-md py-sm mb-xs">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">Platform Control</span>
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-md px-md py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface hover:bg-surface-container-highest'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`material-symbols-outlined text-[20px] ${activeTab === item.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                {item.icon}
              </span>
              {item.label}
              {item.disabled && <span className="ml-auto text-[10px] bg-surface-container px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">Soon</span>}
            </button>
          ))}
        </div>

        <div className="p-sm border-t border-outline-variant">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-md px-md py-2.5 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors mb-1"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">arrow_back</span>
            Exit Admin
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-md px-md py-2.5 rounded-lg text-sm font-medium text-error hover:bg-error-container/50 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-surface-container">
        {/* Top Header */}
        <header className="h-[64px] flex justify-between items-center px-xl bg-surface-container-lowest border-b border-outline-variant flex-shrink-0 z-10">
          <div className="flex items-center gap-md">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-md">
             <span className="inline-flex items-center gap-sm px-sm py-1 bg-error-container/30 border border-error/20 rounded-full">
               <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
               <span className="text-xs font-bold text-error uppercase tracking-wider">Super Admin</span>
             </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-xl">
          <div className="max-w-container-max mx-auto w-full">
            {activeTab === 'organizations' && <OrganizationsTab />}
            {activeTab === 'users' && <SystemUsersTab />}
            {activeTab === 'settings' && <GlobalSettingsTab />}
            {activeTab === 'overview' && (
              <div className="p-xl text-center text-on-surface-variant">Overview dashboard coming soon...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
