import React, { useState, useEffect } from 'react';
import { payrollService } from '../../lib/payrollService';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const PayrollDashboard = ({ activeOrganization }) => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeOrganization) fetchRuns();
  }, [activeOrganization]);

  const fetchRuns = async () => {
    setLoading(true);
    const { data, error_code, message } = await payrollService.getPayrollRuns(activeOrganization.id);
    if (error_code) {
      if (message?.includes('does not exist')) {
        setError('Please run the 20240401000000_payroll_schema.sql migration to enable Payroll.');
      } else {
        setError(message);
      }
    } else {
      setRuns(data || []);
    }
    setLoading(false);
  };

  const getMonthName = (monthNum) => {
    const date = new Date();
    date.setMonth(monthNum - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  const currentYear = new Date().getFullYear();
  const ytdNet = runs
    .filter(r => r.period_year === currentYear && r.status === 'finalized')
    .reduce((sum, r) => sum + Number(r.total_net), 0);

  return (
    <div className="space-y-xl max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="bg-surface-container shadow-sm border border-outline-variant rounded-xl p-xl flex flex-col justify-center">
          <span className="text-on-surface-variant font-medium text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">history</span>
            Total Runs
          </span>
          <span className="font-display-lg text-display-lg text-primary">{runs.length}</span>
        </div>
        <div className="bg-surface-container shadow-sm border border-outline-variant rounded-xl p-xl flex flex-col justify-center">
          <span className="text-on-surface-variant font-medium text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">payments</span>
            YTD Net Pay (Finalized)
          </span>
          <p className="text-display-md font-bold text-primary mt-sm">
            {formatCurrency(ytdNet, activeOrganization.currency, true)}
          </p>
        </div>
        <div className="bg-surface-container shadow-sm border border-outline-variant rounded-xl p-xl flex flex-col justify-center">
          <span className="text-on-surface-variant font-medium text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            Draft Runs
          </span>
          <span className="font-display-lg text-display-lg text-amber-700">
            {runs.filter(r => r.status === 'draft').length}
          </span>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-xl py-lg border-b border-outline-variant bg-surface-container">
          <h3 className="font-title-lg text-title-lg text-on-surface">Recent Payroll Runs</h3>
        </div>
        
        {loading ? (
          <div className="p-xl text-center text-on-surface-variant">Loading payroll data...</div>
        ) : error ? (
          <div className="p-xl text-center text-error bg-error-container/20 border border-error/20 rounded-lg m-xl">
            {error}
          </div>
        ) : runs.length === 0 ? (
          <div className="p-xl text-center text-on-surface-variant">No payroll runs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-outline-variant">
              <thead className="bg-surface-container">
                <tr>
                  <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Period</th>
                  <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-xl py-md text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Gross</th>
                  <th className="px-xl py-md text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {runs.map(run => (
                  <tr key={run.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-xl py-md whitespace-nowrap text-sm font-medium text-on-surface">
                      {getMonthName(run.period_month)} {run.period_year}
                    </td>
                    <td className="px-xl py-md whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-[10px] uppercase font-bold tracking-wider rounded-full border ${
                        run.status === 'finalized' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-xl py-md text-sm text-right font-mono">
                      {formatCurrency(run.total_gross, activeOrganization.currency, true)}
                    </td>
                    <td className="px-xl py-md text-sm text-right font-mono font-medium text-primary">
                      {formatCurrency(run.total_net, activeOrganization.currency, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
