import React, { useState } from 'react';
import { useOrg } from '../org/OrgContext';
import { FinanceDashboard } from './FinanceDashboard';
import { MyExpenses } from './MyExpenses';
import { ExpenseApprovals } from './ExpenseApprovals';
import { InvoicesList } from './InvoicesList';

export const FinanceContainer = () => {
  const { activeOrganization, currentMembership } = useOrg();
  
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'expenses');

  if (!activeOrganization) return null;

  const tabs = [
    ...(isAdmin ? [{ id: 'dashboard', label: 'Overview' }] : []),
    { id: 'expenses', label: 'My Expenses' },
    ...(isAdmin ? [
      { id: 'approvals', label: 'Expense Approvals' },
      { id: 'invoices', label: 'Invoices (AR)' }
    ] : [])
  ];

  return (
    <div className="h-full bg-surface">
      <div className="px-xl pt-xl border-b border-outline-variant">
        <div className="flex items-center gap-sm mb-lg">
          <span className="material-symbols-outlined text-[32px] text-primary">account_balance</span>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Finance & Expenses</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage cash flow, billing, and reimbursements.</p>
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
        {activeTab === 'dashboard' && <FinanceDashboard />}
        {activeTab === 'expenses' && <MyExpenses />}
        {activeTab === 'approvals' && <ExpenseApprovals />}
        {activeTab === 'invoices' && <InvoicesList />}
      </div>
    </div>
  );
};
