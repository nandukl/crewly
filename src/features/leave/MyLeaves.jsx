import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { leaveService } from '../../lib/leaveService';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';

export const MyLeaves = () => {
  const { activeOrganization } = useOrg();
  const [employeeId, setEmployeeId] = useState(null);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [formError, setFormError] = useState(null);

  const fetchContext = async () => {
    if (!activeOrganization) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', activeOrganization.id)
        .single();

      if (!membership) throw new Error("No membership found.");

      const { data: emp } = await supabase
        .from('employee_profiles')
        .select('id')
        .eq('membership_id', membership.id)
        .single();

      if (!emp) throw new Error("No employee profile found.");
      
      setEmployeeId(emp.id);

      const [bals, reqs, types] = await Promise.all([
        leaveService.getBalances(activeOrganization.id, emp.id),
        leaveService.getRequests(emp.id),
        leaveService.getLeaveTypes(activeOrganization.id)
      ]);

      setBalances(bals);
      setRequests(reqs);
      setLeaveTypes(types.filter(t => t.is_active));
      
      if (types.length > 0 && !formData.leave_type_id) {
        setFormData(prev => ({ ...prev, leave_type_id: types[0].id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [activeOrganization]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      // Basic days_count calculation (naive: assumes all days are working days)
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) throw new Error("End date must be after or equal to start date.");
      
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Balance check
      const leaveType = leaveTypes.find(t => t.id === formData.leave_type_id);
      const balance = balances.find(b => b.leave_type_id === formData.leave_type_id);
      const remaining = balance ? parseFloat(balance.remaining_balance) : 0;

      if (!leaveType?.allows_negative_balance && remaining < diffDays) {
        throw new Error(`Insufficient balance. You requested ${diffDays} days, but only have ${remaining} days remaining.`);
      }

      await leaveService.submitRequest(activeOrganization.id, employeeId, {
        ...formData,
        days_count: diffDays
      });

      setShowForm(false);
      setFormData({ leave_type_id: leaveTypes[0]?.id || '', start_date: '', end_date: '', reason: '' });
      await fetchContext();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) return;
    try {
      await leaveService.cancelRequest(requestId);
      await fetchContext();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="animate-pulse">Loading leave data...</div>;
  if (error && !employeeId) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Balances */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium text-slate-900">Leave Balances</h2>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel Request' : 'Request Leave'}</Button>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {balances.length === 0 ? (
            <div className="text-slate-500 text-sm col-span-3">No leave balances found.</div>
          ) : (
            balances.map(b => (
              <div key={b.leave_type_id} className="bg-white overflow-hidden shadow rounded-lg border border-slate-200">
                <div className="px-4 py-5 sm:p-6 text-center">
                  <dt className="text-sm font-medium text-slate-500 truncate">{b.leave_type_name}</dt>
                  <dd className="mt-1 text-3xl font-semibold text-slate-900">{b.remaining_balance}</dd>
                  <div className="mt-2 text-xs text-slate-500">
                    {b.total_used} used / {b.total_entitled} total
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded border border-slate-200 space-y-4">
          <h3 className="text-lg font-medium text-slate-900">New Leave Request</h3>
          {formError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</div>}
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Leave Type</label>
              <select 
                required
                value={formData.leave_type_id}
                onChange={e => setFormData({...formData, leave_type_id: e.target.value})}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Start Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.start_date}
                  onChange={e => setFormData({...formData, start_date: e.target.value})}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">End Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.end_date}
                  onChange={e => setFormData({...formData, end_date: e.target.value})}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Reason</label>
              <textarea 
                required
                rows={3}
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      )}

      {/* History */}
      <div>
        <h2 className="text-xl font-medium text-slate-900 mb-4">Request History</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-slate-200">
            {requests.map(req => (
              <li key={req.id} className="p-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900">
                      {req.leave_types?.name} ({req.days_count} days)
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                    </span>
                    <span className="text-sm text-slate-500 mt-1">{req.reason}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      req.status === 'Cancelled' ? 'bg-slate-100 text-slate-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.status}
                    </span>
                    {(req.status === 'Pending' || req.status === 'Approved') && (
                      <button onClick={() => handleCancel(req.id)} className="text-xs text-red-600 hover:text-red-900 font-medium">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {requests.length === 0 && (
              <li className="p-4 text-center text-slate-500">No leave requests found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
