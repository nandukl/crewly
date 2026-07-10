import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/formatCurrency';

export const InvoicesList = () => {
  const { activeOrganization } = useOrg();
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    account_id: '',
    invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: 0,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (activeOrganization) fetchData();
  }, [activeOrganization]);

  const fetchData = async () => {
    setLoading(true);
    
    const [{ data: invData }, { data: accData }] = await Promise.all([
      supabase.from('fin_invoices').select('*, crm_accounts(name)').eq('organization_id', activeOrganization.id).order('issue_date', { ascending: false }),
      supabase.from('crm_accounts').select('id, name').eq('organization_id', activeOrganization.id)
    ]);
    
    if (invData) setInvoices(invData);
    if (accData) setAccounts(accData);
    
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    const { error } = await supabase
      .from('fin_invoices')
      .insert({
        organization_id: activeOrganization.id,
        account_id: formData.account_id,
        invoice_number: formData.invoice_number,
        amount: formData.amount,
        status: 'draft',
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        notes: formData.notes
      });

    if (!error) {
      setShowForm(false);
      setFormData({
        account_id: '',
        invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: 0,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      });
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('fin_invoices')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (!error) {
      setInvoices(invoices.map(i => i.id === id ? { ...i, status: newStatus } : i));
    } else {
      alert(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-error-container text-error'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  if (loading) return <div className="animate-pulse">Loading invoices...</div>;

  return (
    <div className="space-y-lg max-w-[1200px]">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">Accounts Receivable (Invoices)</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <span className="material-symbols-outlined mr-2">post_add</span>
          Create Invoice
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container p-xl rounded-xl border border-outline-variant shadow-sm max-w-[800px]">
          <h3 className="font-title-md text-on-surface mb-md">Draft New Invoice</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Client (CRM Account)</label>
              <select required className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                <option value="">Select Account...</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Invoice Number</label>
              <input required type="text" className="w-full border rounded-md px-3 py-2 bg-surface font-mono" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Issue Date</label>
              <input required type="date" className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.issue_date} onChange={e => setFormData({...formData, issue_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Due Date</label>
              <input required type="date" className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-on-surface mb-1">Total Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-on-surface-variant font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: activeOrganization.currency || 'USD' }).formatToParts(0).find(x => x.type === 'currency').value}
                </span>
                <input required type="number" step="0.01" min="0.01" className="w-full border rounded-md px-3 py-2 pl-8 bg-surface" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-on-surface mb-1">Notes / Terms</label>
              <textarea className="w-full border rounded-md px-3 py-2 bg-surface" rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Thank you for your business!" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Draft</Button>
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Invoice No.</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Client</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Amount</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Dates</th>
              <th className="px-lg py-sm text-center text-xs font-bold text-on-surface-variant uppercase">Status</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {invoices.length === 0 ? (
              <tr><td colSpan="6" className="px-lg py-xl text-center text-on-surface-variant">No invoices created.</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-surface-container/50 transition-colors">
                <td className="px-lg py-md">
                  <div className="font-mono text-sm font-bold text-on-surface">{inv.invoice_number}</div>
                </td>
                <td className="px-lg py-md text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">business</span>
                  {inv.crm_accounts?.name}
                </td>
                <td className="px-lg py-md text-right font-bold text-on-surface">
                  {formatCurrency(inv.amount, activeOrganization.currency)}
                </td>
                <td className="px-lg py-md text-sm">
                  <div className="text-on-surface-variant">Issued: {new Date(inv.issue_date).toLocaleDateString()}</div>
                  <div className={`font-medium ${new Date(inv.due_date) < new Date() && inv.status !== 'paid' ? 'text-error' : 'text-on-surface'}`}>
                    Due: {new Date(inv.due_date).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-lg py-md text-center">
                  {getStatusBadge(inv.status)}
                </td>
                <td className="px-lg py-md text-right whitespace-nowrap">
                  {inv.status === 'draft' && (
                    <Button variant="outline" className="!px-3 !py-1 !text-xs" onClick={() => updateStatus(inv.id, 'sent')}>Mark Sent</Button>
                  )}
                  {inv.status === 'sent' && (
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" className="!px-2 !py-1 !text-xs !text-error !border-error hover:!bg-error-container" onClick={() => updateStatus(inv.id, 'overdue')}>Overdue</Button>
                      <Button className="!px-2 !py-1 !text-xs !bg-green-700 hover:!bg-green-800" onClick={() => updateStatus(inv.id, 'paid')}>Mark Paid</Button>
                    </div>
                  )}
                  {inv.status === 'overdue' && (
                    <Button className="!px-3 !py-1 !text-xs !bg-green-700 hover:!bg-green-800" onClick={() => updateStatus(inv.id, 'paid')}>Mark Paid</Button>
                  )}
                  {inv.status === 'paid' && (
                    <span className="text-xs text-green-700 italic font-bold">Payment Received</span>
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
