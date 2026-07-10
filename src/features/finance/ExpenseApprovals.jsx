import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/formatCurrency';

export const ExpenseApprovals = () => {
  const { activeOrganization } = useOrg();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOrganization) fetchExpenses();
  }, [activeOrganization]);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fin_expenses')
      .select('*, employee:employee_id(first_name, last_name, avatar_url)')
      .eq('organization_id', activeOrganization.id)
      .order('created_at', { ascending: false });
      
    if (!error) setExpenses(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('fin_expenses')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (!error) {
      setExpenses(expenses.map(e => e.id === id ? { ...e, status: newStatus } : e));
    } else {
      alert(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      rejected: 'bg-error-container text-error'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  if (loading) return <div className="animate-pulse">Loading queue...</div>;

  return (
    <div className="space-y-lg max-w-[1200px]">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">Expense Approvals Queue</h2>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Employee</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Date</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Details</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Amount</th>
              <th className="px-lg py-sm text-center text-xs font-bold text-on-surface-variant uppercase">Status</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {expenses.length === 0 ? (
              <tr><td colSpan="6" className="px-lg py-xl text-center text-on-surface-variant">No expense claims to review.</td></tr>
            ) : expenses.map(exp => (
              <tr key={exp.id} className="hover:bg-surface-container/50 transition-colors">
                <td className="px-lg py-md">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-sm">
                      {exp.employee?.first_name?.charAt(0) || '?'}
                    </div>
                    <div className="font-medium text-sm text-on-surface">
                      {exp.employee?.first_name} {exp.employee?.last_name}
                    </div>
                  </div>
                </td>
                <td className="px-lg py-md text-sm text-on-surface-variant whitespace-nowrap">
                  {new Date(exp.date).toLocaleDateString()}
                </td>
                <td className="px-lg py-md">
                  <div className="font-bold text-sm text-on-surface line-clamp-1">{exp.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">{exp.category}</span>
                    {exp.receipt_url && (
                      <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-primary flex items-center gap-1 hover:underline">
                        <span className="material-symbols-outlined text-[14px]">link</span> Receipt
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-lg py-md text-right font-bold text-on-surface">
                  {formatCurrency(exp.amount, exp.currency)}
                </td>
                <td className="px-lg py-md text-center">
                  {getStatusBadge(exp.status)}
                </td>
                <td className="px-lg py-md text-right whitespace-nowrap">
                  {exp.status === 'pending' && (
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" className="!px-2 !py-1 !text-xs !text-error !border-error hover:!bg-error-container" onClick={() => updateStatus(exp.id, 'rejected')}>Reject</Button>
                      <Button className="!px-2 !py-1 !text-xs" onClick={() => updateStatus(exp.id, 'approved')}>Approve</Button>
                    </div>
                  )}
                  {exp.status === 'approved' && (
                    <Button variant="outline" className="!px-3 !py-1 !text-xs !text-green-700 !border-green-700 hover:!bg-green-50" onClick={() => updateStatus(exp.id, 'paid')}>
                      Mark as Paid
                    </Button>
                  )}
                  {exp.status === 'paid' && (
                    <span className="text-xs text-on-surface-variant italic">Processed</span>
                  )}
                  {exp.status === 'rejected' && (
                    <span className="text-xs text-error italic">Rejected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
