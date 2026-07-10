import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const FinanceDashboard = () => {
  const { activeOrganization } = useOrg();
  const [stats, setStats] = useState({
    income: 0,
    expenses: 0,
    outstandingInvoices: 0,
    pendingExpenses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOrganization) fetchStats();
  }, [activeOrganization]);

  const fetchStats = async () => {
    setLoading(true);
    
    // Ledger sums
    const { data: ledgerData } = await supabase
      .from('fin_transactions')
      .select('type, amount')
      .eq('organization_id', activeOrganization.id);
      
    let income = 0;
    let expenses = 0;
    if (ledgerData) {
      ledgerData.forEach(tx => {
        if (tx.type === 'income') income += Number(tx.amount);
        if (tx.type === 'expense') expenses += Number(tx.amount);
      });
    }

    // Outstanding Invoices (not paid)
    const { data: invoiceData } = await supabase
      .from('fin_invoices')
      .select('amount')
      .eq('organization_id', activeOrganization.id)
      .neq('status', 'paid');
      
    let outstanding = 0;
    if (invoiceData) {
      outstanding = invoiceData.reduce((sum, inv) => sum + Number(inv.amount), 0);
    }

    // Pending Expenses
    const { data: expenseData } = await supabase
      .from('fin_expenses')
      .select('amount')
      .eq('organization_id', activeOrganization.id)
      .eq('status', 'pending');
      
    let pendingExp = 0;
    if (expenseData) {
      pendingExp = expenseData.reduce((sum, exp) => sum + Number(exp.amount), 0);
    }

    setStats({
      income,
      expenses,
      outstandingInvoices: outstanding,
      pendingExpenses: pendingExp
    });
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;

  const netCashFlow = stats.income - stats.expenses;

  return (
    <div className="space-y-xl max-w-[1200px]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className={`p-lg rounded-xl border ${netCashFlow >= 0 ? 'bg-green-50 border-green-200' : 'bg-error-container/20 border-error/30'}`}>
          <p className={`text-label-md mb-xs flex items-center gap-2 ${netCashFlow >= 0 ? 'text-green-700' : 'text-error'}`}>
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            Net Cash Flow
          </p>
          <p className={`text-display-md font-bold ${netCashFlow >= 0 ? 'text-green-700' : 'text-error'}`}>
            {formatCurrency(netCashFlow, activeOrganization.currency)}
          </p>
        </div>
        
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            Total Income (Ledger)
          </p>
          <p className="text-display-md font-bold text-on-surface">{formatCurrency(stats.income, activeOrganization.currency)}</p>
        </div>

        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">trending_down</span>
            Total Expenses (Ledger)
          </p>
          <p className="text-display-md font-bold text-on-surface">{formatCurrency(stats.expenses, activeOrganization.currency)}</p>
        </div>
        
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            A/R (Outstanding Invoices)
          </p>
          <p className="text-display-md font-bold text-primary">{formatCurrency(stats.outstandingInvoices, activeOrganization.currency)}</p>
        </div>
      </div>
      
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm text-center py-20 mt-lg">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 opacity-50">pie_chart</span>
        <h3 className="font-title-lg text-on-surface">Financial Reports</h3>
        <p className="text-on-surface-variant mt-2 max-w-[500px] mx-auto">
          Detailed P&L statements, balance sheets, and expense categorization charts will be available here when the Analytics module is activated.
        </p>
      </div>
    </div>
  );
};
