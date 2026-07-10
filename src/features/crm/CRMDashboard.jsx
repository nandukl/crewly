import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const CRMDashboard = () => {
  const { activeOrganization } = useOrg();
  const [stats, setStats] = useState({ accounts: 0, contacts: 0, deals: 0, pipelineValue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!activeOrganization) return;
      setLoading(true);

      const [
        { count: accCount },
        { count: contactCount },
        { count: dealCount },
        { data: deals }
      ] = await Promise.all([
        supabase.from('crm_accounts').select('*', { count: 'exact', head: true }).eq('organization_id', activeOrganization.id),
        supabase.from('crm_contacts').select('*', { count: 'exact', head: true }).eq('organization_id', activeOrganization.id),
        supabase.from('crm_deals').select('*', { count: 'exact', head: true }).eq('organization_id', activeOrganization.id).neq('stage', 'Lost').neq('stage', 'Won'),
        supabase.from('crm_deals').select('amount').eq('organization_id', activeOrganization.id).neq('stage', 'Lost').neq('stage', 'Won')
      ]);

      const totalValue = deals ? deals.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) : 0;

      setStats({
        accounts: accCount || 0,
        contacts: contactCount || 0,
        deals: dealCount || 0,
        pipelineValue: totalValue
      });
      setLoading(false);
    };

    fetchStats();
  }, [activeOrganization]);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="font-title-lg text-title-lg text-on-surface">CRM Dashboard</h2>
        <p className="text-body-md text-on-surface-variant">Overview of your sales pipeline and contacts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs">Active Deals</p>
          <p className="text-display-md font-bold text-on-surface">{stats.deals}</p>
        </div>
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs">Pipeline Value</p>
          <p className="text-display-md font-bold text-primary">
            {formatCurrency(stats.pipelineValue, activeOrganization.currency, true)}
          </p>
        </div>
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs">Total Accounts</p>
          <p className="text-display-md font-bold text-on-surface">{stats.accounts}</p>
        </div>
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs">Total Contacts</p>
          <p className="text-display-md font-bold text-on-surface">{stats.contacts}</p>
        </div>
      </div>
      
      {/* Placeholder for future activity feed */}
      <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant border-dashed text-center text-on-surface-variant py-xl">
        Activity feed coming soon...
      </div>
    </div>
  );
};
