import React, { useState, useEffect } from 'react';
import { payrollService } from '../../lib/payrollService';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/formatCurrency';

export const RunPayroll = ({ activeOrganization }) => {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // New run form state
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (activeOrganization) fetchRuns();
  }, [activeOrganization]);

  const fetchRuns = async () => {
    setLoading(true);
    const { data, error_code, message } = await payrollService.getPayrollRuns(activeOrganization.id);
    if (!error_code) setRuns(data || []);
    setLoading(false);
  };

  const handleSelectRun = async (run) => {
    setSelectedRun(run);
    setError(null);
    const { data, error_code, message } = await payrollService.getPayslipsForRun(run.id);
    if (error_code) setError(message);
    else setPayslips(data || []);
  };

  const handleGenerateRun = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    const { data, error_code, message } = await payrollService.generatePayrollRun(activeOrganization.id, month, year);
    setGenerating(false);
    if (error_code) {
      setError(`Failed to generate payroll: ${message}`);
    } else {
      await fetchRuns();
      // Auto-select the newly created run
      const { data: newRuns } = await payrollService.getPayrollRuns(activeOrganization.id);
      const newRun = newRuns.find(r => r.id === data);
      if (newRun) handleSelectRun(newRun);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm("Are you sure you want to finalize this payroll run? Payslips will become visible to employees and this cannot be undone.")) return;
    
    setGenerating(true);
    const { error_code, message } = await payrollService.finalizePayrollRun(selectedRun.id, activeOrganization.id);
    setGenerating(false);
    if (error_code) {
      setError(`Failed to finalize: ${message}`);
    } else {
      await fetchRuns();
      setSelectedRun({ ...selectedRun, status: 'finalized' });
    }
  };

  const getMonthName = (monthNum) => {
    const date = new Date();
    date.setMonth(monthNum - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  if (loading && runs.length === 0) return <div className="p-xl text-center text-on-surface-variant">Loading payroll runs...</div>;

  return (
    <div className="space-y-xl max-w-7xl">
      {/* Top section: Generate New Run */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm p-xl flex gap-xl items-center justify-between">
        <div>
          <h3 className="font-title-lg text-title-lg text-on-surface">Process Payroll</h3>
          <p className="text-sm text-on-surface-variant mt-1">Generate payslips for a specific month based on assigned salary bands.</p>
        </div>
        <form onSubmit={handleGenerateRun} className="flex gap-md items-end bg-surface-container p-md rounded-lg border border-outline-variant">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-md py-sm border border-outline-variant rounded bg-surface-container-lowest text-sm min-w-[120px]">
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 px-md py-sm border border-outline-variant rounded bg-surface-container-lowest text-sm" />
          </div>
          <Button type="submit" disabled={generating}>
            {generating ? 'Processing...' : 'Generate Run'}
          </Button>
        </form>
      </div>

      {error && (
        <div className="bg-error-container border border-error/20 p-md rounded-lg text-error text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex gap-xl h-[600px]">
        {/* Left sidebar: Run History */}
        <div className="w-1/3 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-lg py-md border-b border-outline-variant bg-surface-container">
            <h4 className="font-title-md font-bold text-on-surface">Payroll History</h4>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
            {runs.length === 0 ? (
              <div className="p-xl text-center text-on-surface-variant text-sm">No past runs found.</div>
            ) : runs.map(run => (
              <button 
                key={run.id}
                onClick={() => handleSelectRun(run)}
                className={`w-full text-left px-lg py-md transition-colors ${
                  selectedRun?.id === run.id ? 'bg-primary-container border-l-4 border-primary' : 'hover:bg-surface-container/50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-semibold ${selectedRun?.id === run.id ? 'text-primary' : 'text-on-surface'}`}>
                    {getMonthName(run.period_month)} {run.period_year}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${
                    run.status === 'finalized' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {run.status}
                  </span>
                </div>
                <div className="text-xs text-on-surface-variant font-mono">
                  Net: {formatCurrency(run.total_net, activeOrganization.currency, true)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Payslips for selected run */}
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
          {selectedRun ? (
            <>
              <div className="px-xl py-lg border-b border-outline-variant bg-surface-container flex justify-between items-center">
                <div>
                  <h4 className="font-title-md font-bold text-on-surface">
                    Payslips for {getMonthName(selectedRun.period_month)} {selectedRun.period_year}
                  </h4>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {payslips.length} employees processed • Total Net: <span className="font-mono text-primary font-bold">{formatCurrency(selectedRun.total_net, activeOrganization.currency, true)}</span>
                  </p>
                </div>
                {selectedRun.status === 'draft' && (
                  <Button onClick={handleFinalize} disabled={generating}>
                    Finalize Run
                  </Button>
                )}
                {selectedRun.status === 'finalized' && (
                  <span className="flex items-center gap-1 text-green-600 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Finalized
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-0">
                <table className="min-w-full divide-y divide-outline-variant">
                  <thead className="bg-surface-container-low sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Employee</th>
                      <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Gross Pay</th>
                      <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Deductions</th>
                      <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {payslips.map(slip => (
                      <tr key={slip.id} className="hover:bg-surface-container/30">
                        <td className="px-lg py-md">
                          <div className="text-sm font-semibold text-on-surface">{slip.employee?.first_name} {slip.employee?.last_name}</div>
                          <div className="text-xs text-on-surface-variant font-mono">{slip.employee?.employee_id_str} • {slip.employee?.designation}</div>
                        </td>
                        <td className="px-lg py-md text-sm text-right font-mono text-on-surface-variant">
                          {formatCurrency(slip.gross_pay, activeOrganization.currency, true)}
                        </td>
                        <td className="px-lg py-md text-sm text-right font-mono text-error">
                          -{formatCurrency(slip.breakdown?.deduction_total || 0, activeOrganization.currency, true)}
                        </td>
                        <td className="px-lg py-md text-sm text-right font-mono font-bold text-primary">
                          {formatCurrency(slip.net_pay, activeOrganization.currency, true)}
                        </td>
                      </tr>
                    ))}
                    {payslips.length === 0 && (
                      <tr><td colSpan="4" className="px-lg py-xl text-center text-on-surface-variant">No payslips found in this run. Did you assign salary structures?</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
              <span className="material-symbols-outlined text-[64px] mb-4">account_balance_wallet</span>
              <p>Select a payroll run from the history to view payslips.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
