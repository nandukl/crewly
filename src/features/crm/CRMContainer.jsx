import React, { useState } from 'react';
import { useOrg } from '../org/OrgContext';
import { CRMDashboard } from './CRMDashboard';
import { AccountsList } from './AccountsList';
import { ContactsList } from './ContactsList';
import { DealsKanban } from './DealsKanban';

export const CRMContainer = () => {
  const { currentMembership } = useOrg();
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="mb-lg border-b border-outline-variant">
        <h1 className="font-display-sm text-display-sm text-on-surface mb-sm">CRM</h1>
        
        <div className="flex space-x-md">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`pb-sm font-label-lg transition-colors ${
              activeSubTab === 'dashboard'
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`pb-sm font-label-lg transition-colors ${
              activeSubTab === 'accounts'
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Accounts
          </button>

          <button
            onClick={() => setActiveSubTab('contacts')}
            className={`pb-sm font-label-lg transition-colors ${
              activeSubTab === 'contacts'
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Contacts
          </button>

          <button
            onClick={() => setActiveSubTab('deals')}
            className={`pb-sm font-label-lg transition-colors ${
              activeSubTab === 'deals'
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Deals
          </button>
        </div>
      </div>

      <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
        {activeSubTab === 'dashboard' && <CRMDashboard />}
        {activeSubTab === 'accounts' && <AccountsList />}
        {activeSubTab === 'contacts' && <ContactsList />}
        {activeSubTab === 'deals' && <DealsKanban />}
      </div>
    </div>
  );
};
