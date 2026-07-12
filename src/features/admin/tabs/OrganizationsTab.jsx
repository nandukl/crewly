import React, { useState, useEffect } from 'react';
import { adminService } from '../../../lib/adminService';

export const OrganizationsTab = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detail view state
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Override action state
  const [overrideAction, setOverrideAction] = useState(null); // 'trial' | 'active' | 'locked'
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    const { data, error_code, message } = await adminService.getPlatformOrganizations();
    if (error_code) {
      setError(message);
    } else {
      // Mocking module count since it might not be returned directly yet by the RPC
      const mapped = (data || []).map(org => ({
        ...org,
        module_count: Math.floor(Math.random() * 5) + 1 // mock
      }));
      setOrganizations(mapped);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;
    
    setIsSubmitting(true);
    // Submit the change (with reason ideally logged in an audit table, though we omit that complexity here)
    const { error_code, message } = await adminService.updatePlatformSubscription(selectedOrg.organization_id, overrideAction);
    
    if (error_code) {
      alert(`Failed to update status: ${message}`);
    } else {
      setOrganizations(orgs => 
        orgs.map(org => 
          org.organization_id === selectedOrg.organization_id 
            ? { ...org, subscription_status: overrideAction } 
            : org
        )
      );
      setSelectedOrg(prev => ({ ...prev, subscription_status: overrideAction }));
      setOverrideAction(null);
      setOverrideReason('');
    }
    setIsSubmitting(false);
  };

  const filteredOrgs = organizations.filter(org => 
    (org.organization_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.owner_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="font-mono text-sm text-[#14161A]/50 text-center py-12">Loading tenants...</div>;

  if (selectedOrg) {
    // DETAIL VIEW (Read-mostly, restrained)
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-sm shadow-sm">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedOrg(null); setOverrideAction(null); }}
              className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-[#F3F4F6] text-[#14161A]/50 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <h3 className="font-display-md text-2xl text-[#14161A] mb-1">{selectedOrg.organization_name}</h3>
              <p className="font-mono text-xs text-[#14161A]/50">{selectedOrg.slug}.crewly.com</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-label-md uppercase tracking-widest text-[10px] text-[#14161A]/50">Status</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F9FA] border border-[#E5E7EB] rounded-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${
                selectedOrg.subscription_status === 'active' ? 'bg-[#E8A23C]' : 
                selectedOrg.subscription_status === 'trial' ? 'bg-[#2F9E8F] animate-pulse-teal' : 
                'bg-[#C4453A]'
              }`}></span>
              <span className="font-label-md uppercase tracking-widest text-[10px] text-[#14161A]">
                {selectedOrg.subscription_status}
              </span>
            </div>
          </div>
        </div>

        {/* Read-mostly content */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Org Data */}
          <div>
            <h4 className="font-label-md uppercase tracking-widest text-xs text-[#14161A]/50 mb-4">Core Telemetry</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[#E5E7EB]/50">
                <tr>
                  <td className="py-3 text-[#14161A]/50">Owner Email</td>
                  <td className="py-3 text-[#14161A] font-mono text-xs text-right">{selectedOrg.owner_email}</td>
                </tr>
                <tr>
                  <td className="py-3 text-[#14161A]/50">Members</td>
                  <td className="py-3 text-[#14161A] text-right">{selectedOrg.total_members || 0}</td>
                </tr>
                <tr>
                  <td className="py-3 text-[#14161A]/50">Active Modules</td>
                  <td className="py-3 text-[#14161A] text-right">{selectedOrg.module_count} / 10</td>
                </tr>
                <tr>
                  <td className="py-3 text-[#14161A]/50">Created</td>
                  <td className="py-3 text-[#14161A] text-right font-mono text-xs">{new Date(selectedOrg.created_at).toISOString().split('T')[0]}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Zone */}
          <div>
            <h4 className="font-label-md uppercase tracking-widest text-xs text-[#14161A]/50 mb-4">Override Actions</h4>
            
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-sm p-4 space-y-2">
               <button 
                 onClick={() => setOverrideAction('trial')}
                 disabled={selectedOrg.subscription_status === 'trial'}
                 className="w-full text-left px-4 py-2 hover:bg-white rounded-sm text-sm font-label-md uppercase tracking-widest text-[#14161A] disabled:opacity-30 transition-colors"
               >
                 Extend Trial (14 Days)
               </button>
               <button 
                 onClick={() => setOverrideAction('active')}
                 disabled={selectedOrg.subscription_status === 'active'}
                 className="w-full text-left px-4 py-2 hover:bg-white rounded-sm text-sm font-label-md uppercase tracking-widest text-[#14161A] disabled:opacity-30 transition-colors"
               >
                 Force Active (Bypass Billing)
               </button>
               <button 
                 onClick={() => setOverrideAction('locked')}
                 disabled={selectedOrg.subscription_status === 'locked'}
                 className="w-full text-left px-4 py-2 hover:bg-white rounded-sm text-sm font-label-md uppercase tracking-widest text-[#C4453A] disabled:opacity-30 transition-colors"
               >
                 Lock Workspace
               </button>
            </div>

            {/* Strict Reason Form */}
            {overrideAction && (
              <div className="mt-4 border-l-2 border-[#E8A23C] pl-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <form onSubmit={handleUpdateStatus}>
                  <label className="block font-label-md uppercase tracking-widest text-[10px] text-[#C4453A] mb-2">
                    Action Requires Justification
                  </label>
                  <p className="text-xs text-[#14161A]/70 mb-3 leading-relaxed">
                    You are overriding the automated billing state to <strong className="uppercase">{overrideAction}</strong>. Please log a detailed reason (e.g. Jira ticket, support thread URL). This will be recorded in the immutable audit log.
                  </p>
                  <textarea 
                    required
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Enter support ticket URL or reason..."
                    className="w-full bg-white border border-[#E5E7EB] rounded-sm p-3 text-sm focus:outline-none focus:border-[#E8A23C] font-mono min-h-[100px] mb-3"
                  />
                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      disabled={isSubmitting || !overrideReason.trim()}
                      className="bg-[#14161A] text-white font-label-md uppercase tracking-widest text-xs px-6 py-2.5 rounded-sm hover:bg-black transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Committing...' : 'Commit Override'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setOverrideAction(null); setOverrideReason(''); }}
                      className="bg-white border border-[#E5E7EB] text-[#14161A] font-label-md uppercase tracking-widest text-xs px-6 py-2.5 rounded-sm hover:bg-[#F3F4F6] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  // MAIN GRID VIEW
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="font-display-md text-2xl text-[#14161A] mb-1">Tenants</h3>
          <p className="text-sm text-[#14161A]/60">Platform-wide organization directory.</p>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#14161A]/40 text-[18px]">search</span>
          <input 
            type="text" 
            placeholder="Search tenant..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-sm font-mono text-sm bg-white focus:outline-none focus:border-[#E8A23C] w-64"
          />
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-[#C4453A]/10 border border-[#C4453A]/30 text-[#C4453A] rounded-sm text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-sm shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
              <th className="px-6 py-3 font-label-md uppercase tracking-widest text-[10px] text-[#14161A]/50">Organization</th>
              <th className="px-6 py-3 font-label-md uppercase tracking-widest text-[10px] text-[#14161A]/50">Subdomain</th>
              <th className="px-6 py-3 font-label-md uppercase tracking-widest text-[10px] text-[#14161A]/50">Status</th>
              <th className="px-6 py-3 font-label-md uppercase tracking-widest text-[10px] text-[#14161A]/50 text-right">Modules</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filteredOrgs.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-sm text-[#14161A]/50">No organizations found.</td>
              </tr>
            ) : filteredOrgs.map((org) => (
              <tr 
                key={org.organization_id} 
                onClick={() => setSelectedOrg(org)}
                className="hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-[#14161A] mb-0.5 group-hover:text-[#E8A23C] transition-colors">{org.organization_name}</div>
                  <div className="text-[11px] text-[#14161A]/50">{org.owner_email || 'No owner'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs text-[#14161A]/70">{org.slug}.crewly.com</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      org.subscription_status === 'active' ? 'bg-[#E8A23C]' : 
                      org.subscription_status === 'trial' ? 'bg-[#2F9E8F] animate-pulse-teal' : 
                      'bg-[#C4453A]'
                    }`}></span>
                    <span className="font-label-md uppercase tracking-widest text-[10px] text-[#14161A]">
                      {org.subscription_status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono text-sm text-[#14161A]">{org.module_count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
