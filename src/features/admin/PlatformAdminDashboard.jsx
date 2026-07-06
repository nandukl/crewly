import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/adminService';
import { supabase } from '../../lib/supabaseClient';

export const PlatformAdminDashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleUpdateStatus = async (orgId, newStatus) => {
    setUpdatingId(orgId);
    const { error_code, message } = await adminService.updatePlatformSubscription(orgId, newStatus);
    if (error_code) {
      alert(`Failed to update status: ${message}`);
    } else {
      // Update local state
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

  if (loading) return <div className="p-8 text-center text-slate-600">Loading Platform Data...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Platform Admin
          </h1>
          <div className="flex gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-300 hover:text-white transition">Exit Admin</button>
            <button onClick={handleSignOut} className="text-sm text-slate-400 hover:text-white transition">Sign Out</button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded">
            Error: {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">All Organizations</h3>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium border border-slate-200">
              {organizations.length} Total Tenants
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Organization Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Owner Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.organization_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">{org.organization_name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{org.organization_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {org.owner_email || 'No owner found'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full border w-max
                          ${org.subscription_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            org.subscription_status === 'trial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            org.subscription_status === 'locked' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          Sub: {(org.subscription_status || 'UNKNOWN').toUpperCase()}
                        </span>
                        
                        {org.organization_status === 'archived' && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full border bg-gray-100 text-gray-700 border-gray-300 w-max">
                            Org: ARCHIVED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <select 
                          disabled={updatingId === org.organization_id}
                          value={org.subscription_status || ''}
                          onChange={(e) => handleUpdateStatus(org.organization_id, e.target.value)}
                          className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 font-semibold text-xs border border-red-200 bg-red-50 px-2 py-1.5 rounded"
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
      </main>
    </div>
  );
};
