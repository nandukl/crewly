import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const AnalyticsDashboard = () => {
  const { activeOrganization } = useOrg();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    headcount: 0,
    mrr: 0, // Mock Monthly Recurring Revenue from Subscriptions/Contracts
    ytdRevenue: 0,
    openTickets: 0
  });

  useEffect(() => {
    if (activeOrganization) fetchKPIs();
  }, [activeOrganization]);

  const fetchKPIs = async () => {
    setLoading(true);
    
    // 1. Headcount
    const { count: hc } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganization.id);
      
    // 2. YTD Revenue (sum of all 'income' transactions this year)
    const currentYear = new Date().getFullYear();
    const { data: ledger } = await supabase
      .from('fin_transactions')
      .select('amount')
      .eq('organization_id', activeOrganization.id)
      .eq('type', 'income')
      .gte('date', `${currentYear}-01-01`);
      
    const ytdRev = ledger?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

    // 3. Open Support Tickets
    const { count: openTix } = await supabase
      .from('hd_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganization.id)
      .in('status', ['open', 'in_progress']);
      
    // 4. MRR (We'll estimate based on Active CRM Deals marked as 'won' that are subscriptions. For MVP, just proxy it from total invoice amount divided by 12, or just 0 if no data)
    // To keep it fast, we'll just show 0 if not implemented.
    
    setKpis({
      headcount: hc || 0,
      ytdRevenue: ytdRev,
      openTickets: openTix || 0,
      mrr: ytdRev / 12 // Very rough proxy for demo purposes
    });
    
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Aggregating company data...</div>;

  return (
    <div className="space-y-xl max-w-[1200px]">
      <h2 className="font-title-lg text-title-lg text-on-surface mb-md">Executive Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* KPI 1: Revenue */}
        <div className="bg-primary text-on-primary p-lg rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <span className="material-symbols-outlined text-[120px]">payments</span>
          </div>
          <p className="text-sm font-medium mb-1 relative z-10">YTD Revenue</p>
          <p className="text-display-md font-bold relative z-10">{formatCurrency(kpis.ytdRevenue, activeOrganization.currency)}</p>
        </div>

        {/* KPI 2: MRR */}
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-primary">
            <span className="material-symbols-outlined text-[120px]">monitoring</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant mb-1 relative z-10">Estimated MRR</p>
          <p className="text-display-md font-bold text-on-surface relative z-10">{formatCurrency(kpis.mrr, activeOrganization.currency)}</p>
        </div>

        {/* KPI 3: Headcount */}
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-primary">
            <span className="material-symbols-outlined text-[120px]">groups</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant mb-1 relative z-10">Total Headcount</p>
          <p className="text-display-md font-bold text-on-surface relative z-10">{kpis.headcount}</p>
        </div>

        {/* KPI 4: Open Issues */}
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-primary">
            <span className="material-symbols-outlined text-[120px]">support_agent</span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant mb-1 relative z-10">Open Support Tickets</p>
          <p className="text-display-md font-bold text-on-surface relative z-10">{kpis.openTickets}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mt-lg">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm min-h-[300px] flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 opacity-30">show_chart</span>
          <h3 className="font-title-md text-on-surface">Revenue Growth (YOY)</h3>
          <p className="text-sm text-on-surface-variant mt-2 max-w-[300px]">
            Historical charting requires at least 12 months of aggregated ledger data.
          </p>
        </div>
        
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm min-h-[300px] flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 opacity-30">pie_chart</span>
          <h3 className="font-title-md text-on-surface">Expense Breakdown</h3>
          <p className="text-sm text-on-surface-variant mt-2 max-w-[300px]">
            Visual breakdown of expenses by category (Travel, SaaS, Payroll).
          </p>
        </div>
      </div>
    </div>
  );
};
