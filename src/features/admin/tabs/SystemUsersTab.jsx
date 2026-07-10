import React, { useState, useEffect } from 'react';
import { adminService } from '../../../lib/adminService';

export const SystemUsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error_code, message } = await adminService.getSystemUsers();
    if (error_code) {
      if (error_code === 'FETCH_ERROR' && message.includes('does not exist')) {
        setError('Please run the 20240315000000_superadmin_expansion.sql migration in your Supabase SQL Editor to enable this feature.');
      } else {
        setError(message);
      }
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-surface-container-lowest shadow-sm rounded-xl overflow-hidden border border-outline-variant">
      <div className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-surface-container">
        <div>
          <h3 className="font-title-lg text-title-lg text-on-surface">Platform Users</h3>
          <p className="text-sm text-on-surface-variant mt-1">Manage all registered user accounts.</p>
        </div>
        <div className="flex items-center gap-md">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-xl pr-md py-sm border border-outline-variant rounded-lg focus-ring font-body-sm bg-surface-container-lowest w-64"
            />
          </div>
          <span className="text-sm font-medium text-on-surface-variant bg-surface-container-high px-sm py-1 rounded-full border border-outline-variant">
            {users.length} Total Users
          </span>
        </div>
      </div>
      
      {loading ? (
        <div className="p-xl text-center text-on-surface-variant">Loading system users...</div>
      ) : error ? (
        <div className="m-xl p-md bg-error-container border border-error/20 text-error rounded-lg">
          <p className="font-bold mb-2">Error loading users:</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-outline-variant">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">User Account</th>
                <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Last Active Org</th>
                <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Registered</th>
                <th className="px-xl py-md text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-surface-container-lowest divide-y divide-outline-variant">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-xl py-lg text-center text-on-surface-variant">No users found.</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-surface-container/50 transition-colors">
                  <td className="px-xl py-md whitespace-nowrap">
                    <div className="text-sm font-semibold text-on-surface">{user.email}</div>
                    <div className="text-xs text-on-surface-variant/50 font-mono mt-1">{user.user_id}</div>
                  </td>
                  <td className="px-xl py-md whitespace-nowrap">
                    {user.last_active_org_name ? (
                      <span className="text-sm text-on-surface">{user.last_active_org_name}</span>
                    ) : (
                      <span className="text-sm text-on-surface-variant italic">Never logged in</span>
                    )}
                  </td>
                  <td className="px-xl py-md whitespace-nowrap text-sm text-on-surface-variant">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-xl py-md whitespace-nowrap">
                    {user.is_super_admin ? (
                      <span className="px-2 py-1 inline-flex text-[10px] uppercase font-bold tracking-wider rounded-full bg-primary-container text-on-primary-container border border-primary/20">
                        Super Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-[10px] uppercase font-bold tracking-wider rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant">
                        Standard User
                      </span>
                    )}
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
