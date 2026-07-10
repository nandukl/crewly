import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const SalesReports = () => {
  const { activeOrganization } = useOrg();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalDeals: 0,
    wonDealsValue: 0,
    openPipelineValue: 0,
    stageCounts: {}
  });

  useEffect(() => {
    if (activeOrganization) fetchSalesData();
  }, [activeOrganization]);

  const fetchSalesData = async () => {
    setLoading(true);
    
    const { data: deals } = await supabase
      .from('crm_deals')
      .select('stage, amount')
      .eq('organization_id', activeOrganization.id);
      
    let total = 0;
    let wonValue = 0;
    let openValue = 0;
    let stages = {
      lead: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      won: 0,
      lost: 0
    };
    
    if (deals) {
      total = deals.length;
      deals.forEach(deal => {
        const amt = Number(deal.amount || 0);
        if (deal.stage === 'won') wonValue += amt;
        if (['lead', 'contacted', 'qualified', 'proposal'].includes(deal.stage)) openValue += amt;
        
        if (stages[deal.stage] !== undefined) {
          stages[deal.stage]++;
        }
      });
    }

    setData({
      totalDeals: total,
      wonDealsValue: wonValue,
      openPipelineValue: openValue,
      stageCounts: stages
    });
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading sales reports...</div>;

  const winRate = data.totalDeals > 0 
    ? ((data.stageCounts.won / data.totalDeals) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-lg max-w-[1000px]">
      <h2 className="font-title-lg text-title-lg text-on-surface">Sales & CRM Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Open Pipeline Value</p>
          <p className="text-headline-md font-bold text-primary">{formatCurrency(data.openPipelineValue, activeOrganization.currency)}</p>
        </div>
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Closed Won Value</p>
          <p className="text-headline-md font-bold text-green-700">{formatCurrency(data.wonDealsValue, activeOrganization.currency)}</p>
        </div>
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Overall Win Rate</p>
          <p className="text-headline-md font-bold text-on-surface">{winRate}%</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
        <h3 className="font-title-md font-bold text-on-surface mb-md">Deal Funnel (Active & Closed)</h3>
        <div className="space-y-4">
          {Object.entries(data.stageCounts).map(([stage, count]) => {
            const percentage = data.totalDeals > 0 ? (count / data.totalDeals) * 100 : 0;
            const stageNames = {
              lead: 'Leads',
              contacted: 'Contacted',
              qualified: 'Qualified',
              proposal: 'Proposals',
              won: 'Closed Won',
              lost: 'Closed Lost'
            };
            
            let barColor = 'bg-primary';
            if (stage === 'won') barColor = 'bg-green-600';
            if (stage === 'lost') barColor = 'bg-gray-400';

            return (
              <div key={stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-on-surface uppercase tracking-wider text-xs">{stageNames[stage]}</span>
                  <span className="text-on-surface-variant">{count} deals</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-4">
                  <div className={`${barColor} h-4 rounded-full`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
