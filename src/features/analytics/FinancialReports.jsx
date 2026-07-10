import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const FinancialReports = () => {
  const { activeOrganization } = useOrg();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    recentTransactions: []
  });

  useEffect(() => {
    if (activeOrganization) fetchFinanceData();
  }, [activeOrganization]);

  const fetchFinanceData = async () => {
    setLoading(true);
    
    const { data: ledger } = await supabase
      .from('fin_transactions')
      .select('*')
      .eq('organization_id', activeOrganization.id)
      .order('date', { ascending: false });
      
    let inc = 0;
    let exp = 0;
    let recent = [];
    
    if (ledger) {
      ledger.forEach(tx => {
        if (tx.type === 'income') inc += Number(tx.amount);
        if (tx.type === 'expense') exp += Number(tx.amount);
      });
      recent = ledger.slice(0, 10);
    }
    
    setData({
      totalIncome: inc,
      totalExpenses: exp,
      recentTransactions: recent
    });
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading financial reports...</div>;

  const profitMargin = data.totalIncome > 0 
    ? (((data.totalIncome - data.totalExpenses) / data.totalIncome) * 100).toFixed(1) 
    : 0;

  return (
    <div className="space-y-lg max-w-[1000px]">
      <h2 className="font-title-lg text-title-lg text-on-surface">Financial Health</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Total Income</p>
          <p className="text-headline-md font-bold text-green-700">{formatCurrency(data.totalIncome, activeOrganization.currency)}</p>
        </div>
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Total Expenses</p>
          <p className="text-headline-md font-bold text-error">{formatCurrency(data.totalExpenses, activeOrganization.currency)}</p>
        </div>
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant">
          <p className="text-sm font-medium text-on-surface-variant mb-1">Net Profit Margin</p>
          <p className="text-headline-md font-bold text-on-surface">{profitMargin}%</p>
        </div>
      </div>
      
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-title-md font-bold text-on-surface">Recent Ledger Entries</h3>
        </div>
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-lowest">
            <tr>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Date</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Type</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Description</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data.recentTransactions.length === 0 ? (
              <tr><td colSpan="4" className="px-lg py-xl text-center text-on-surface-variant">No ledger entries found.</td></tr>
            ) : data.recentTransactions.map(tx => (
              <tr key={tx.id} className="hover:bg-surface-container/50">
                <td className="px-lg py-sm text-sm text-on-surface-variant whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="px-lg py-sm">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-error-container text-error'}`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-lg py-sm text-sm text-on-surface">{tx.description}</td>
                <td className={`px-lg py-sm text-sm font-bold text-right ${tx.type === 'income' ? 'text-green-700' : 'text-error'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, activeOrganization.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
