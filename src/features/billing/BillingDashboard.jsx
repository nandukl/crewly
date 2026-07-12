import React from 'react';
import { useOrg } from '../org/OrgContext';

export const BillingDashboard = () => {
  const { activeOrganization, subscriptionStatus } = useOrg();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your plan, payment methods, and invoices.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold mb-4">Current Plan</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold uppercase tracking-wide">
            {subscriptionStatus || 'Trial'}
          </div>
          <span className="text-slate-600">Your organization is currently on the active plan.</span>
        </div>
        
        <div className="pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500 mb-4">Billing management integration (Stripe Customer Portal) will be implemented here.</p>
          <button className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors" disabled>
            Manage Subscription
          </button>
        </div>
      </div>
    </div>
  );
};
