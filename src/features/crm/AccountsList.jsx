import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';

export const AccountsList = () => {
  const { activeOrganization } = useOrg();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', industry: '', website: '', status: 'Active' });

  const fetchAccounts = async () => {
    if (!activeOrganization) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_accounts')
      .select('*')
      .eq('organization_id', activeOrganization.id)
      .order('name', { ascending: true });
      
    if (!error) setAccounts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [activeOrganization]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeOrganization) return;

    const { error } = await supabase
      .from('crm_accounts')
      .insert({
        organization_id: activeOrganization.id,
        ...formData
      });

    if (!error) {
      setShowModal(false);
      setFormData({ name: '', industry: '', website: '', status: 'Active' });
      fetchAccounts();
    } else {
      console.error(error);
      alert('Failed to save account');
    }
  };

  if (loading) return <div>Loading accounts...</div>;

  return (
    <div className="space-y-lg">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface">Accounts</h2>
          <p className="text-body-md text-on-surface-variant">Manage your business clients and prospects.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-on-primary px-md py-sm rounded-lg font-label-md hover:bg-primary/90 transition-colors"
        >
          Add Account
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-lg shadow-xl">
            <h3 className="font-title-lg mb-md">New Account</h3>
            <form onSubmit={handleSubmit} className="space-y-md">
              <div>
                <label className="block text-label-sm font-medium mb-xs">Account Name</label>
                <input required type="text" className="w-full border rounded-md px-3 py-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-label-sm font-medium mb-xs">Industry</label>
                <input type="text" className="w-full border rounded-md px-3 py-2" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} />
              </div>
              <div>
                <label className="block text-label-sm font-medium mb-xs">Website</label>
                <input type="url" className="w-full border rounded-md px-3 py-2" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
              </div>
              <div className="flex justify-end gap-sm mt-lg">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary/90">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center p-xl text-on-surface-variant bg-surface-container-low rounded-xl border border-dashed">
          No accounts found. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-surface-container-low p-md rounded-xl border border-outline-variant hover:shadow-md transition-shadow">
              <h4 className="font-title-md font-bold text-on-surface">{acc.name}</h4>
              {acc.industry && <p className="text-body-sm text-on-surface-variant mt-1">{acc.industry}</p>}
              {acc.website && (
                <a href={acc.website} target="_blank" rel="noreferrer" className="text-primary text-body-sm hover:underline mt-2 inline-block">
                  {acc.website}
                </a>
              )}
              <div className="mt-md pt-sm border-t border-outline-variant flex justify-between items-center">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${acc.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                  {acc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
