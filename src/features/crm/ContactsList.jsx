import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';

export const ContactsList = () => {
  const { activeOrganization } = useOrg();
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({ 
    account_id: '', first_name: '', last_name: '', email: '', phone: '', job_title: '' 
  });

  const fetchData = async () => {
    if (!activeOrganization) return;
    setLoading(true);
    
    const [
      { data: contactData },
      { data: accountData }
    ] = await Promise.all([
      supabase
        .from('crm_contacts')
        .select('*, crm_accounts(name)')
        .eq('organization_id', activeOrganization.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('crm_accounts')
        .select('id, name')
        .eq('organization_id', activeOrganization.id)
    ]);
      
    if (contactData) setContacts(contactData);
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
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      job_title: formData.job_title,
    };
    if (formData.account_id) {
      payload.account_id = formData.account_id;
    }

    const { error } = await supabase
      .from('crm_contacts')
      .insert(payload);

    if (!error) {
      setShowModal(false);
      setFormData({ account_id: '', first_name: '', last_name: '', email: '', phone: '', job_title: '' });
      fetchData();
    } else {
      console.error(error);
      alert('Failed to save contact');
    }
  };

  if (loading) return <div>Loading contacts...</div>;

  return (
    <div className="space-y-lg">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface">Contacts</h2>
          <p className="text-body-md text-on-surface-variant">Manage individuals and key stakeholders.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-on-primary px-md py-sm rounded-lg font-label-md hover:bg-primary/90 transition-colors"
        >
          Add Contact
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-lg shadow-xl">
            <h3 className="font-title-lg mb-md">New Contact</h3>
            <form onSubmit={handleSubmit} className="space-y-md">
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <label className="block text-label-sm font-medium mb-xs">First Name</label>
                  <input required type="text" className="w-full border rounded-md px-3 py-2" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-label-sm font-medium mb-xs">Last Name</label>
                  <input type="text" className="w-full border rounded-md px-3 py-2" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-label-sm font-medium mb-xs">Email</label>
                <input type="email" className="w-full border rounded-md px-3 py-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-label-sm font-medium mb-xs">Phone</label>
                <input type="text" className="w-full border rounded-md px-3 py-2" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>

              <div>
                <label className="block text-label-sm font-medium mb-xs">Job Title</label>
                <input type="text" className="w-full border rounded-md px-3 py-2" value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} />
              </div>

              <div>
                <label className="block text-label-sm font-medium mb-xs">Linked Account (Optional)</label>
                <select className="w-full border rounded-md px-3 py-2" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                  <option value="">-- No Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
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

      {contacts.length === 0 ? (
        <div className="text-center p-xl text-on-surface-variant bg-surface-container-low rounded-xl border border-dashed">
          No contacts found. Create one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto bg-surface-container-low rounded-xl border border-outline-variant">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant text-label-md text-on-surface-variant">
                <th className="p-md">Name</th>
                <th className="p-md">Title</th>
                <th className="p-md">Account</th>
                <th className="p-md">Email / Phone</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-outline-variant hover:bg-surface-container-lowest transition-colors">
                  <td className="p-md font-medium text-on-surface">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="p-md text-body-sm text-on-surface-variant">{c.job_title || '-'}</td>
                  <td className="p-md text-body-sm text-primary">{c.crm_accounts?.name || '-'}</td>
                  <td className="p-md text-body-sm text-on-surface-variant">
                    {c.email && <div className="truncate max-w-[200px]">{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
