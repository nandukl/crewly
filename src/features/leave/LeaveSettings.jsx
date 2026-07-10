import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { leaveService } from '../../lib/leaveService';
import { hrService } from '../../lib/hrService';
import { Button } from '../../components/ui/Button';

export const LeaveSettings = () => {
  const { activeOrganization } = useOrg();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Policy Form State
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  
  // Balance Adjustment Form State
  const [showAdjForm, setShowAdjForm] = useState(false);
  const [adjData, setAdjData] = useState({ employee_id: '', leave_type_id: '', amount: '', description: '' });

  const fetchData = async () => {
    if (!activeOrganization) return;
    try {
      setLoading(true);
      const [types, emps] = await Promise.all([
        leaveService.getLeaveTypes(activeOrganization.id),
        hrService.getEmployeeDirectory(activeOrganization.id)
      ]);
      setLeaveTypes(types);
      setEmployees(emps || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOrganization]);

  const handleTypeSave = async (e) => {
    e.preventDefault();
    try {
      if (editingType.id) {
        await leaveService.updateLeaveType(editingType.id, editingType);
      } else {
        await leaveService.createLeaveType(activeOrganization.id, editingType);
      }
      setShowTypeForm(false);
      setEditingType(null);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdjSave = async (e) => {
    e.preventDefault();
    try {
      await leaveService.grantLeave(
        activeOrganization.id, 
        adjData.employee_id, 
        adjData.leave_type_id, 
        parseFloat(adjData.amount), 
        adjData.description
      );
      setShowAdjForm(false);
      setAdjData({ employee_id: '', leave_type_id: '', amount: '', description: '' });
      alert('Balance adjusted successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="py-8">Loading settings...</div>;

  return (
    <div className="space-y-10">
      {/* Policy Configuration */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Leave Policies</h2>
            <p className="text-sm text-slate-500">Configure available leave types and rules.</p>
          </div>
          <Button onClick={() => {
            setEditingType({ name: '', description: '', requires_approval: true, allows_negative_balance: false, is_active: true });
            setShowTypeForm(true);
          }}>
            Add Leave Type
          </Button>
        </div>

        {showTypeForm && editingType && (
          <form onSubmit={handleTypeSave} className="bg-slate-50 p-6 rounded border border-slate-200 space-y-4 mb-6">
            <h3 className="text-lg font-medium text-slate-900">{editingType.id ? 'Edit' : 'New'} Leave Type</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input required type="text" value={editingType.name} onChange={e => setEditingType({...editingType, name: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <input type="text" value={editingType.description || ''} onChange={e => setEditingType({...editingType, description: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="reqApp" checked={editingType.requires_approval} onChange={e => setEditingType({...editingType, requires_approval: e.target.checked})} className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded" />
                <label htmlFor="reqApp" className="text-sm text-slate-700">Requires Approval</label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="allowNeg" checked={editingType.allows_negative_balance} onChange={e => setEditingType({...editingType, allows_negative_balance: e.target.checked})} className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded" />
                <label htmlFor="allowNeg" className="text-sm text-slate-700">Allows Negative Balance</label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="isActive" checked={editingType.is_active} onChange={e => setEditingType({...editingType, is_active: e.target.checked})} className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded" />
                <label htmlFor="isActive" className="text-sm text-slate-700">Is Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowTypeForm(false)}>Cancel</Button>
              <Button type="submit">Save Policy</Button>
            </div>
          </form>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-slate-200">
            {leaveTypes.map(type => (
              <li key={type.id} className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    {type.name}
                    {!type.is_active && <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">Inactive</span>}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{type.description}</p>
                  <div className="text-xs text-slate-500 mt-1 space-x-2">
                    <span>{type.requires_approval ? 'Requires Approval' : 'Auto-Approve'}</span>
                    <span>&bull;</span>
                    <span>{type.allows_negative_balance ? 'Allows Negative' : 'Strict Balance Check'}</span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { setEditingType(type); setShowTypeForm(true); }}>Edit</Button>
              </li>
            ))}
            {leaveTypes.length === 0 && <li className="p-4 text-slate-500 text-center">No leave policies configured.</li>}
          </ul>
        </div>
      </div>

      {/* Manual Balance Adjustments */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Balance Adjustments</h2>
            <p className="text-sm text-slate-500">Manually grant or deduct leave balances.</p>
          </div>
          <Button onClick={() => setShowAdjForm(!showAdjForm)}>New Adjustment</Button>
        </div>

        {showAdjForm && (
          <form onSubmit={handleAdjSave} className="bg-slate-50 p-6 rounded border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Employee</label>
                <select required value={adjData.employee_id} onChange={e => setAdjData({...adjData, employee_id: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                  <option value="">Select Employee...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName || emp.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Leave Type</label>
                <select required value={adjData.leave_type_id} onChange={e => setAdjData({...adjData, leave_type_id: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                  <option value="">Select Type...</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Amount (Days)</label>
                <input required type="number" step="0.5" value={adjData.amount} onChange={e => setAdjData({...adjData, amount: e.target.value})} placeholder="e.g. 5 or -2" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                <p className="text-xs text-slate-500 mt-1">Use negative value to deduct.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Reason / Description</label>
                <input required type="text" value={adjData.description} onChange={e => setAdjData({...adjData, description: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowAdjForm(false)}>Cancel</Button>
              <Button type="submit">Submit Adjustment</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
