import React, { useState, useEffect } from 'react';
import { adminService } from '../../../lib/adminService';

export const OrganizationsTab = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    const { data, error_code, message } = await adminService.getPlatformOrganizations();
    if (error_code) {
      setError(message);
    } else {
      setOrganizations(data || []);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (orgId, newStatus) => {
    setUpdatingId(orgId);
    const { error_code, message } = await adminService.updatePlatformSubscription(orgId, newStatus);
    if (error_code) {
      alert(`Failed to update status: ${message}`);
    } else {
      setOrganizations(orgs => 
        orgs.map(org => 
          org.organization_id === orgId 
            ? { ...org, subscription_status: newStatus } 
            : org
        )
      );
    }
    setUpdatingId(null);
  };

  const handleArchiveOrg = async (orgId) => {
    if (!window.confirm("Are you sure you want to archive this organization? Users will lose access.")) return;
    
    setUpdatingId(orgId);
    const { error_code, message } = await adminService.archiveOrganization(orgId);
    if (error_code) {
      alert(`Failed to archive organization: ${message}`);
    } else {
      setOrganizations(orgs => 
        orgs.map(org => 
          org.organization_id === orgId 
            ? { ...org, organization_status: 'archived' } 
            : org
        )
      );
    }
    setUpdatingId(null);
  };

  const filteredOrgs = organizations.filter(org => 
    (org.organization_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.owner_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Loading Platform Data...</div>;

  return (
    <div className="bg-surface-container-lowest shadow-sm rounded-xl overflow-hidden border border-outline-variant">
      <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-surface-container">
        <div>
          <h3 className="font-title-lg text-title-lg text-on-surface">Platform Tenants</h3>
          <p className="text-sm text-on-surface-variant mt-1">Manage tenant workspaces and subscriptions.</p>
        </div>
        <div className="flex items-center gap-md">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search organizations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-xl pr-md py-sm border border-outline-variant rounded-lg focus-ring font-body-sm bg-surface-container-lowest w-64"
            />
          </div>
          <span className="text-sm font-medium text-on-surface-variant bg-surface-container-high px-sm py-1 rounded-full border border-outline-variant">
            {organizations.length} Total Tenants
          </span>
        </div>
      </div>
      
      {error && (
        <div className="m-xl p-md bg-error-container border border-error/20 text-error rounded-lg">
          <p className="font-bold mb-2">Error loading organizations:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container">
            <tr>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tenant</th>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Usage & Members</th>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Created</th>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sub Status</th>
              <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface-container-lowest divide-y divide-outline-variant">
            {filteredOrgs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-xl py-lg text-center text-on-surface-variant">No organizations found.</td>
              </tr>
            ) : filteredOrgs.map((org) => (
              <tr key={org.organization_id} className="hover:bg-surface-container/50 transition-colors">
                <td className="px-xl py-md whitespace-nowrap">
                  <div className="text-sm font-semibold text-on-surface flex items-center gap-2">
                    {org.organization_name}
                    {org.organization_status === 'archived' && (
                       <span className="px-1.5 py-0.5 inline-flex text-[10px] uppercase font-bold tracking-wider rounded border border-error/30 bg-error-container/50 text-error">
                         Archived
                       </span>
                    )}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">mail</span>
                    {org.owner_email || 'No owner found'}
                  </div>
                </td>
                <td className="px-xl py-md whitespace-nowrap">
                  <div className="text-sm font-medium text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">group</span>
                    {org.total_members !== undefined ? `${org.total_members} Active Users` : 'Run DB Migration'}
                  </div>
                </td>
                <td className="px-xl py-md whitespace-nowrap text-sm text-on-surface-variant">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="px-xl py-md whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    <span className={`px-2 py-1 inline-flex text-[10px] leading-5 uppercase font-bold tracking-wider rounded-full border w-max
                      ${org.subscription_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 
                        org.subscription_status === 'trial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        org.subscription_status === 'locked' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-surface-container-high text-on-surface-variant border-outline-variant'}`}>
                      {org.subscription_status || 'UNKNOWN'}
                    </span>
                  </div>
                </td>
                <td className="px-xl py-md whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <select 
                      disabled={updatingId === org.organization_id}
                      value={org.subscription_status || ''}
                      onChange={(e) => handleUpdateStatus(org.organization_id, e.target.value)}
                      className="text-xs border border-outline-variant rounded-md px-2 py-1.5 bg-surface-container-lowest focus-ring text-on-surface disabled:opacity-50"
                    >
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="grace_period">Grace Period</option>
                      <option value="locked">Locked</option>
                    </select>

                    {org.organization_status !== 'archived' && (
                      <button
                        onClick={() => handleArchiveOrg(org.organization_id)}
                        disabled={updatingId === org.organization_id}
                        className="text-error hover:text-error/80 disabled:opacity-50 font-bold text-xs border border-error/20 bg-error-container/20 px-2 py-1.5 rounded transition-colors"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
