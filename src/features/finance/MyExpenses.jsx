import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/formatCurrency';

const CATEGORIES = ['Travel', 'Meals & Entertainment', 'Office Supplies', 'Software/IT', 'Training', 'Other'];

export const MyExpenses = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'Travel',
    description: '',
    receipt_url: ''
  });

  useEffect(() => {
    if (activeOrganization && currentMembership) fetchExpenses();
  }, [activeOrganization, currentMembership]);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fin_expenses')
      .select('*')
      .eq('organization_id', activeOrganization.id)
      .eq('employee_id', currentMembership.user_id)
      .order('date', { ascending: false });
      
    if (!error) setExpenses(data || []);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    const { error } = await supabase
      .from('fin_expenses')
      .insert({
        organization_id: activeOrganization.id,
        employee_id: currentMembership.user_id,
        amount: formData.amount,
        currency: activeOrganization.currency, // default to org currency for MVP simplicity
        date: formData.date,
        category: formData.category,
        description: formData.description,
        receipt_url: formData.receipt_url || null,
        status: 'pending'
      });

    if (!error) {
      setShowForm(false);
      setFormData({ amount: 0, date: new Date().toISOString().split('T')[0], category: 'Travel', description: '', receipt_url: '' });
      fetchExpenses();
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

  if (loading) return <div className="animate-pulse">Loading expenses...</div>;

  return (
    <div className="space-y-lg max-w-[1200px]">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">My Expense Claims</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <span className="material-symbols-outlined mr-2">receipt</span>
          Submit Claim
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container p-xl rounded-xl border border-outline-variant shadow-sm max-w-[800px]">
          <h3 className="font-title-md text-on-surface mb-md">New Expense Claim</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Date incurred</label>
              <input required type="date" className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Category</label>
              <select className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-on-surface mb-1">Description</label>
              <input required type="text" className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Client dinner at 123 Cafe" />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-on-surface-variant font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: activeOrganization.currency || 'USD' }).formatToParts(0).find(x => x.type === 'currency').value}
                </span>
                <input required type="number" step="0.01" min="0.01" className="w-full border rounded-md px-3 py-2 pl-8 bg-surface" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Receipt URL (Optional)</label>
              <input type="url" className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.receipt_url} onChange={e => setFormData({...formData, receipt_url: e.target.value})} placeholder="https://..." />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Submit for Approval</Button>
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Date</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Details</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Amount</th>
              <th className="px-lg py-sm text-center text-xs font-bold text-on-surface-variant uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {expenses.length === 0 ? (
              <tr><td colSpan="4" className="px-lg py-xl text-center text-on-surface-variant">No expense claims submitted.</td></tr>
            ) : expenses.map(exp => (
              <tr key={exp.id} className="hover:bg-surface-container/50 transition-colors">
                <td className="px-lg py-md text-sm text-on-surface-variant whitespace-nowrap">
                  {new Date(exp.date).toLocaleDateString()}
                </td>
                <td className="px-lg py-md">
                  <div className="font-bold text-on-surface">{exp.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">{exp.category}</span>
                    {exp.receipt_url && (
                      <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-primary flex items-center gap-1 hover:underline">
                        <span className="material-symbols-outlined text-[14px]">link</span> Receipt
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-lg py-md text-right font-bold text-on-surface">
                  {formatCurrency(exp.amount, exp.currency || activeOrganization.currency)}
                </td>
                <td className="px-lg py-md text-center">
                  {getStatusBadge(exp.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
