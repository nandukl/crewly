import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { rbacService } from '../../lib/rbacService';
import { Button } from '../../components/ui/Button';
import en from '../../locales/en.json';

const AVAILABLE_RESOURCES = ['employee_records', 'payroll_runs', 'billing_invoices', 'organization_settings'];
const AVAILABLE_ACTIONS = ['view', 'edit', 'approve', 'delete'];

export const RoleManagement = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const t = en.rbac.roles;

  const canEdit = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';

  const loadRoles = async () => {
    if (!activeOrganization) return;
    try {
      setLoading(true);
      const data = await rbacService.getCustomRoles(activeOrganization.id);
      setRoles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [activeOrganization]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingRole.permission_grants.length === 0) {
      alert('A custom role must have at least one permission grant.');
      return;
    }
    
    try {
      if (editingRole.id) {
        await rbacService.updateCustomRole(
          activeOrganization.id,
          editingRole.id,
          editingRole.name,
          editingRole.description,
          editingRole.permission_grants
        );
      } else {
        await rbacService.createCustomRole(
          activeOrganization.id,
          editingRole.name,
          editingRole.description,
          editingRole.permission_grants
        );
      }
      setEditingRole(null);
      await loadRoles();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm(t.deleteWarning)) return;
    try {
      await rbacService.deleteCustomRole(activeOrganization.id, roleId);
      await loadRoles();
    } catch (err) {
      alert(err.message);
    }
  };

  const addGrant = () => {
    setEditingRole({
      ...editingRole,
      permission_grants: [
        ...editingRole.permission_grants,
        { resource_type: AVAILABLE_RESOURCES[0], action: 'view', is_allowed: true }
      ]
    });
  };

  const updateGrant = (index, field, value) => {
    const newGrants = [...editingRole.permission_grants];
    newGrants[index][field] = value;
    setEditingRole({ ...editingRole, permission_grants: newGrants });
  };

  const removeGrant = (index) => {
    const newGrants = [...editingRole.permission_grants];
    newGrants.splice(index, 1);
    setEditingRole({ ...editingRole, permission_grants: newGrants });
  };

  if (!activeOrganization) return null;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t.title}</h1>
        {canEdit && (
          <Button onClick={() => setEditingRole({ name: '', description: '', permission_grants: [] })}>
            {t.createButton}
          </Button>
        )}
      </div>

      {editingRole && (
        <div className="mt-8 bg-white shadow sm:rounded-lg p-6 border border-slate-200">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">{t.nameLabel}</label>
                <input required type="text" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{t.descriptionLabel}</label>
                <input type="text" value={editingRole.description || ''} onChange={e => setEditingRole({...editingRole, description: e.target.value})} className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-slate-900">{t.grantsTitle}</h3>
                <Button type="button" onClick={addGrant} variant="secondary" size="sm">{t.addGrant}</Button>
              </div>
              
              <div className="space-y-3">
                {editingRole.permission_grants.map((grant, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded border border-slate-200">
                    <select value={grant.resource_type} onChange={e => updateGrant(idx, 'resource_type', e.target.value)} className="block w-1/3 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm">
                      {AVAILABLE_RESOURCES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={grant.action} onChange={e => updateGrant(idx, 'action', e.target.value)} className="block w-1/4 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm">
                      {AVAILABLE_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={grant.is_allowed} onChange={e => updateGrant(idx, 'is_allowed', e.target.value === 'true')} className="block w-1/4 border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm">
                      <option value="true">{t.allowLabel}</option>
                      <option value="false">{t.denyLabel}</option>
                    </select>
                    <button type="button" onClick={() => removeGrant(idx)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>
                  </div>
                ))}
                {editingRole.permission_grants.length === 0 && (
                  <p className="text-sm text-slate-500">No permissions added yet. A role must have at least one permission.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditingRole(null)}>Cancel</Button>
              <Button type="submit">{t.saveButton}</Button>
            </div>
          </form>
        </div>
      )}

      {!loading && !editingRole && roles.length === 0 && (
        <p className="mt-8 text-slate-500">No custom roles defined yet.</p>
      )}

      {!editingRole && roles.length > 0 && (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-slate-300">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">{t.nameLabel}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">{t.descriptionLabel}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">{t.grantsTitle}</th>
                      {canEdit && <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{role.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{role.description}</td>
                        <td className="px-3 py-4 text-sm text-slate-500">
                          {role.permission_grants.length} rule(s)
                        </td>
                        {canEdit && (
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-3">
                            <button onClick={() => setEditingRole(role)} className="text-primary hover:text-primary-dark">{t.edit}</button>
                            <button onClick={() => handleDelete(role.id)} className="text-red-600 hover:text-red-900">{t.delete}</button>
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
      )}
    </div>
  );
};
