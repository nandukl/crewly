import React, { useState, useEffect } from 'react';
import { payrollService } from '../../lib/payrollService';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

export const MyPayslips = ({ employeeId }) => {
  const { activeOrganization } = useOrg();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId) fetchPayslips();
  }, [employeeId]);

  const fetchPayslips = async () => {
    setLoading(true);
    const { data, error_code } = await payrollService.getMyPayslips(employeeId);
    if (!error_code) setPayslips(data || []);
    setLoading(false);
  };

  const getMonthName = (monthNum) => {
    const date = new Date();
    date.setMonth(monthNum - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  const handleDownload = (payslip) => {
    // In a real app, this would trigger a PDF generation or file download.
    alert(`Downloading payslip for ${getMonthName(payslip.payroll_run.period_month)} ${payslip.payroll_run.period_year}... (Mock)`);
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant animate-pulse">Loading your payslips...</div>;

  return (
    <div className="space-y-md max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">My Payslips</h2>
          <p className="text-sm text-on-surface-variant mt-1">View and download your monthly salary slips.</p>
        </div>
      </div>

      {payslips.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant p-xl text-center rounded-xl shadow-sm text-on-surface-variant">
          You do not have any payslips available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {payslips.map(slip => (
            <div key={slip.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-title-lg text-primary font-bold">
                    {getMonthName(slip.payroll_run.period_month)} {slip.payroll_run.period_year}
                  </h4>
                  <span className={`inline-flex mt-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${
                    slip.payroll_run.status === 'finalized' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {slip.payroll_run.status === 'finalized' ? 'Available' : 'Processing'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-on-surface-variant uppercase tracking-wider font-bold">Net Pay</div>
                  <div className="text-xl font-mono text-on-surface font-bold">
                    {formatCurrency(slip.net_pay, activeOrganization?.currency, true)}
                  </div>
                </div>
              </div>
              
              <div className="bg-surface-container rounded-lg p-md mb-4 flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-on-surface-variant">Base Salary</span>
                  <span className="font-mono">{formatCurrency(slip.breakdown?.base || 0, activeOrganization?.currency, false)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-on-surface-variant">Allowances</span>
                  <span className="font-mono text-green-700">+{formatCurrency(slip.breakdown?.allowance_total || 0, activeOrganization?.currency, false)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-outline-variant/50 mt-1">
                  <span className="text-on-surface-variant font-medium">Gross Pay</span>
                  <span className="font-mono font-medium">{formatCurrency(slip.gross_pay, activeOrganization?.currency, false)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-on-surface-variant">Deductions</span>
                  <span className="font-mono text-error">-{formatCurrency(slip.breakdown?.deduction_total || 0, activeOrganization?.currency, false)}</span>
                </div>
              </div>

              <button 
                onClick={() => handleDownload(slip)}
                disabled={slip.payroll_run.status !== 'finalized'}
                className="w-full flex justify-center items-center gap-2 py-2 border border-outline-variant rounded-lg text-sm font-medium text-primary hover:bg-surface-container-highest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
