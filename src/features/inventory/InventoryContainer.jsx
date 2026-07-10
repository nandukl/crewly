import React, { useState } from 'react';
import { useOrg } from '../org/OrgContext';
import { InventoryDashboard } from './InventoryDashboard';
import { ItemsList } from './ItemsList';
import { LocationsList } from './LocationsList';
import { StockOperations } from './StockOperations';

export const InventoryContainer = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!activeOrganization) return null;

  // Only admins can access Inventory for now
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';
  
  if (!isAdmin) {
    return (
      <div className="h-full bg-surface p-xl flex items-center justify-center">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-[64px] text-error opacity-50 mb-4">block</span>
          <h2 className="font-headline-sm text-on-surface">Access Denied</h2>
          <p className="text-on-surface-variant mt-2">Only organization administrators can manage inventory.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'catalog', label: 'Item Catalog' },
    { id: 'locations', label: 'Locations' },
    { id: 'operations', label: 'Stock Operations' }
  ];

  return (
    <div className="h-full bg-surface">
      <div className="px-xl pt-xl border-b border-outline-variant">
        <div className="flex items-center gap-sm mb-lg">
          <span className="material-symbols-outlined text-[32px] text-primary">inventory_2</span>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Inventory Management</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Track physical goods, SKUs, and stock movements.</p>
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
        {activeTab === 'dashboard' && <InventoryDashboard />}
        {activeTab === 'catalog' && <ItemsList />}
        {activeTab === 'locations' && <LocationsList />}
        {activeTab === 'operations' && <StockOperations />}
      </div>
    </div>
  );
};
