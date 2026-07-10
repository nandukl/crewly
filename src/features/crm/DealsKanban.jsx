import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { formatCurrency } from '../../lib/formatCurrency';

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export const DealsKanban = () => {
  const { activeOrganization } = useOrg();
  const [deals, setDeals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    account_id: '', title: '', amount: '', stage: 'Lead', expected_close_date: '' 
  });

  const fetchData = async () => {
    if (!activeOrganization) return;
    setLoading(true);
    
    const [
      { data: dealData },
      { data: accountData }
    ] = await Promise.all([
      supabase
        .from('crm_deals')
        .select('*, crm_accounts(name)')
        .eq('organization_id', activeOrganization.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('crm_accounts')
        .select('id, name')
        .eq('organization_id', activeOrganization.id)
    ]);
      
    if (dealData) setDeals(dealData);
    if (accountData) setAccounts(accountData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeOrganization]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeOrganization) return;

    const payload = {
      organization_id: activeOrganization.id,
      title: formData.title,
      amount: formData.amount || 0,
      stage: formData.stage,
    };
    if (formData.account_id) payload.account_id = formData.account_id;
    if (formData.expected_close_date) payload.expected_close_date = formData.expected_close_date;

    const { error } = await supabase
      .from('crm_deals')
      .insert(payload);

    if (!error) {
      setShowModal(false);
      setFormData({ account_id: '', title: '', amount: '', stage: 'Lead', expected_close_date: '' });
      fetchData();
    } else {
      console.error(error);
      alert('Failed to save deal');
    }
  };

  const handleStageChange = async (dealId, newStage) => {
    // Optimistic UI update
    setDeals(deals.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    
    const { error } = await supabase
      .from('crm_deals')
      .update({ stage: newStage })
      .eq('id', dealId);

    if (error) {
      console.error(error);
      alert('Error updating deal stage');
      fetchData(); // Revert
    }
  };

  if (loading) return <div>Loading deals...</div>;

  return (
    <div className="space-y-lg flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface">Deals Pipeline</h2>
          <p className="text-body-md text-on-surface-variant">Track your sales opportunities.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-on-primary px-md py-sm rounded-lg font-label-md hover:bg-primary/90 transition-colors"
        >
          Add Deal
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-lg shadow-xl">
            <h3 className="font-title-lg mb-md">New Deal</h3>
            <form onSubmit={handleSubmit} className="space-y-md">
              <div>
                <label className="block text-label-sm font-medium mb-xs">Deal Title</label>
                <input required type="text" placeholder="e.g. Acme Q3 License" className="w-full border rounded-md px-3 py-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-label-sm font-medium mb-xs">Account (Optional)</label>
                <select className="w-full border rounded-md px-3 py-2" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                  <option value="">-- No Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <label className="block text-label-sm font-medium mb-xs">Amount ($)</label>
                  <input type="number" min="0" step="0.01" className="w-full border rounded-md px-3 py-2" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-label-sm font-medium mb-xs">Close Date</label>
                  <input type="date" className="w-full border rounded-md px-3 py-2" value={formData.expected_close_date} onChange={e => setFormData({...formData, expected_close_date: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-medium mb-xs">Initial Stage</label>
                <select className="w-full border rounded-md px-3 py-2" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-sm mt-lg">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary/90">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-md min-w-max h-full">
          {STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            const totalStageValue = stageDeals.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
            
            return (
              <div key={stage} className="bg-surface-container-lowest w-72 rounded-xl border border-outline flex flex-col h-full max-h-[70vh]">
                <div className="p-sm border-b border-outline bg-surface-container">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-title-sm font-bold text-on-surface">{stage}</h3>
                    <span className="text-label-sm bg-surface-container-high px-2 py-0.5 rounded-full text-on-surface-variant">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="text-label-sm text-primary font-medium">
                    {formatCurrency(totalStageValue, activeOrganization.currency, false)}
                  </div>
                </div>
                
                <div className="p-sm flex-1 overflow-y-auto space-y-sm">
                  {stageDeals.map(deal => (
                    <div key={deal.id} className="bg-surface p-sm rounded-lg shadow-sm border border-outline-variant hover:border-primary transition-colors cursor-grab">
                      <h4 className="font-title-sm text-on-surface line-clamp-2">{deal.title}</h4>
                      <p className="text-label-sm text-on-surface-variant mt-1">{deal.crm_accounts?.name || 'No Account'}</p>
                      <p className="text-body-sm font-bold text-primary mt-2">{formatCurrency(deal.amount, activeOrganization.currency, false)}</p>
                      
                      {/* Simple dropdown to move stages for v1 instead of full drag-and-drop */}
                      <select 
                        className="mt-2 w-full text-xs bg-surface-container border-outline rounded p-1"
                        value={deal.stage}
                        onChange={(e) => handleStageChange(deal.id, e.target.value)}
                      >
                        {STAGES.map(s => <option key={s} value={s}>Move to {s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
