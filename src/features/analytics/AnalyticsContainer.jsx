import React, { useState } from 'react';
import { useOrg } from '../org/OrgContext';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { FinancialReports } from './FinancialReports';
import { HRReports } from './HRReports';
import { SalesReports } from './SalesReports';

export const AnalyticsContainer = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!activeOrganization) return null;

  // Strict Access Control: Analytics is highly sensitive
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';
  
  if (!isAdmin) {
    return (
      <div className="h-full bg-surface p-xl flex items-center justify-center">
        <div className="text-center max-w-[500px]">
          <span className="material-symbols-outlined text-[64px] text-error opacity-50 mb-4">gavel</span>
          <h2 className="font-headline-sm text-on-surface">Executive Access Required</h2>
          <p className="text-on-surface-variant mt-2">
            The Analytics and Reporting module contains highly sensitive cross-functional data (salaries, company revenue, etc). 
            You must be an Organization Administrator to view this module.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Company KPIs' },
    { id: 'finance', label: 'Financials' },
    { id: 'hr', label: 'People (HR)' },
    { id: 'sales', label: 'Sales (CRM)' }
  ];

  return (
    <div className="h-full bg-surface">
      <div className="px-xl pt-xl border-b border-outline-variant">
        <div className="flex items-center gap-sm mb-lg">
          <span className="material-symbols-outlined text-[32px] text-primary">bar_chart</span>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Analytics & Reporting</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Real-time insights across your entire organization.</p>
          </div>
        </div>

        <div className="flex gap-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-lg py-sm font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-xl">
        {activeTab === 'dashboard' && <AnalyticsDashboard />}
        {activeTab === 'finance' && <FinancialReports />}
        {activeTab === 'hr' && <HRReports />}
        {activeTab === 'sales' && <SalesReports />}
      </div>
    </div>
  );
};
