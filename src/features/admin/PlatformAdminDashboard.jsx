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
    <div className="flex h-screen bg-[#F8F9FA] text-[#14161A] font-body-md selection:bg-[#E8A23C]/30 overflow-hidden">
      {/* Side Navigation - Distinct stark white/gray panel */}
      <aside className="w-[240px] bg-white border-r border-[#E5E7EB] flex flex-col z-20 flex-shrink-0 shadow-sm">
        <div className="h-[64px] flex items-center px-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#14161A] rounded-sm flex items-center justify-center">
               <span className="material-symbols-outlined text-[16px] text-white">admin_panel_settings</span>
            </div>
            <span className="font-display-md text-sm font-bold tracking-tight text-[#14161A] mt-0.5">Platform Admin</span>
          </div>
        </div>

        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 py-2 mb-2 border-b border-[#E5E7EB]/50">
            <span className="text-[10px] font-medium text-[#14161A]/50">Control surface</span>
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-[#14161A] text-white'
                  : 'text-[#14161A]/70 hover:bg-[#F3F4F6] hover:text-[#14161A]'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`material-symbols-outlined text-[16px] ${activeTab === item.id ? 'text-white' : 'text-[#14161A]/50'}`}>
                {item.icon}
              </span>
              <span className="mt-0.5">{item.label}</span>
              {item.disabled && <span className="ml-auto text-[9px] font-medium bg-[#E5E7EB] px-1.5 py-0.5 rounded-sm text-[#14161A]/60">SOON</span>}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#E5E7EB] space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-[#14161A]/70 hover:bg-[#F3F4F6] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span className="mt-0.5">Exit Admin</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-[#C4453A] hover:bg-[#C4453A]/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span className="mt-0.5">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F8F9FA]">
        {/* Top Header */}
        <header className="h-[64px] flex justify-between items-center px-8 bg-white border-b border-[#E5E7EB] flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="font-display-md text-xl font-bold text-[#14161A]">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#14161A] rounded-sm">
               <span className="w-1.5 h-1.5 rounded-full bg-[#E8A23C] animate-pulse-amber"></span>
               <span className="text-xs font-medium text-white mt-0.5">Super Admin active</span>
             </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto w-full">
            {activeTab === 'organizations' && <OrganizationsTab />}
            {activeTab === 'users' && <SystemUsersTab />}
            {activeTab === 'settings' && <GlobalSettingsTab />}
            {activeTab === 'overview' && (
              <div className="p-8 text-center font-mono text-[#14161A]/50">Overview dashboard coming soon...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
