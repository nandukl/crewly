import React, { useState } from 'react';
import { useOrg } from './OrgContext';
import { orgService } from '../../lib/orgService';
import { Button } from '../../components/ui/Button';
import en from '../../locales/en.json';
import { rbacService } from '../../lib/rbacService';

export const MembershipManagement = () => {
  const { activeOrganization, currentMembership, refreshOrganizations } = useOrg();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom Roles state
  const [managingRolesFor, setManagingRolesFor] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  
  const t = en.org.members;

  if (!activeOrganization) return null;
  const canEdit = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';
  const isOwner = currentMembership?.role === 'owner';

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      setLoading(true);
      setError('');
      await orgService.inviteMember(activeOrganization.id, inviteEmail, inviteRole);
      setInviteEmail('');
      await refreshOrganizations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (membershipId, newStatus) => {
    if (!canEdit) return;
    try {
      await orgService.updateMembershipStatus(membershipId, newStatus);
      await refreshOrganizations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTransfer = async (membershipId) => {
    if (!isOwner) return;
    const confirm = window.confirm(t.transferWarning);
    if (!confirm) return;
    try {
      await orgService.transferOwnership(activeOrganization.id, membershipId);
      await refreshOrganizations();
    } catch (err) {
      alert(err.message);
    }
  };

  const openRoleManager = async (membership) => {
    try {
      const roles = await rbacService.getCustomRoles(activeOrganization.id);
      setAvailableRoles(roles);
      setSelectedRoleIds(membership.membership_custom_roles?.map(r => r.custom_role_id) || []);
      setManagingRolesFor(membership);
    } catch (err) {
      alert(err.message);
    }
  };

  const saveRoles = async () => {
    try {
      await rbacService.assignCustomRolesToMembership(activeOrganization.id, managingRolesFor.id, selectedRoleIds);
      setManagingRolesFor(null);
      await refreshOrganizations();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleRole = (roleId) => {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter(id => id !== roleId));
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-slate-900">{t.title}</h1>
        </div>
      </div>
      
      {canEdit && (
        <form onSubmit={handleInvite} className="mt-4 flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700">{t.emailLabel}</label>
            <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{t.roleLabel}</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm">
              <option value="org_admin">Org Admin</option>
              <option value="app_admin">App Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>
          <Button type="submit" disabled={loading}>{loading ? '...' : t.inviteButton}</Button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">{t.emailLabel}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">{t.roleLabel}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Custom Roles</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">{t.statusLabel}</th>
                    {canEdit && <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">{t.actionsLabel}</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {activeOrganization.memberships.map((person) => (
                    <tr key={person.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{person.email}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 capitalize">{person.role.replace('_', ' ')}</td>
                      <td className="px-3 py-4 text-sm text-slate-500">
                        <div className="flex flex-wrap gap-1">
                          {person.membership_custom_roles?.map(mr => (
                            <span key={mr.custom_role_id} className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              {mr.custom_roles?.name}
                            </span>
                          ))}
                          {(!person.membership_custom_roles || person.membership_custom_roles.length === 0) && (
                            <span className="text-slate-400 italic text-xs">None</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${person.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {person.status.replace('_', ' ')}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                          {person.status === 'active' && (
                            <button onClick={() => openRoleManager(person)} className="text-blue-600 hover:text-blue-900">Roles</button>
                          )}
                          {isOwner && person.status === 'active' && person.role !== 'owner' && (
                            <button onClick={() => handleTransfer(person.id)} className="text-primary hover:text-primary-dark">{t.transferOwnership}</button>
                          )}
                          {person.role !== 'owner' && person.status !== 'removed' && (
                            <button onClick={() => handleStatusChange(person.id, 'removed')} className="text-red-600 hover:text-red-900">{t.remove}</button>
                          )}
                          {person.role !== 'owner' && person.status === 'active' && (
                            <button onClick={() => handleStatusChange(person.id, 'suspended')} className="text-yellow-600 hover:text-yellow-900">{t.suspend}</button>
                          )}
                          {person.role !== 'owner' && person.status === 'suspended' && (
                            <button onClick={() => handleStatusChange(person.id, 'active')} className="text-green-600 hover:text-green-900">{t.reactivate}</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {managingRolesFor && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Manage Custom Roles</h2>
            <p className="text-sm text-slate-500 mb-4">Assign custom roles to <strong>{managingRolesFor.email}</strong>.</p>
            
            <div className="space-y-3 max-h-60 overflow-y-auto mb-6">
              {availableRoles.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No custom roles defined in this organization yet.</p>
              ) : (
                availableRoles.map(role => (
                  <label key={role.id} className="flex items-start gap-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{role.name}</p>
                      <p className="text-xs text-slate-500">{role.description}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setManagingRolesFor(null)}>Cancel</Button>
              <Button type="button" onClick={saveRoles}>Save Roles</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
