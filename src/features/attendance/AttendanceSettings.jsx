import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { attendanceService } from '../../lib/attendanceService';
import { Button } from '../../components/ui/Button';

export const AttendanceSettings = () => {
  const { activeOrganization } = useOrg();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPolicy = async () => {
    if (!activeOrganization) return;
    try {
      setLoading(true);
      const data = await attendanceService.getPolicy(activeOrganization.id);
      setPolicy(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, [activeOrganization]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await attendanceService.updatePolicy(activeOrganization.id, {
        working_hours_per_day: parseFloat(policy.working_hours_per_day),
        regularization_window_days: parseInt(policy.regularization_window_days, 10)
      });
      alert('Policy updated successfully.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-medium text-slate-900 mb-6">Attendance Policy Configuration</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50 p-6 rounded-lg border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700">Working Hours Per Day</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input 
              type="number" 
              step="0.5"
              min="1"
              max="24"
              value={policy.working_hours_per_day} 
              onChange={e => setPolicy({...policy, working_hours_per_day: e.target.value})}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-primary focus:border-primary sm:text-sm" 
            />
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-100 text-slate-500 sm:text-sm">
              hours
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">The standard hours required for a full working day. Used by Payroll.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Regularization Window</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input 
              type="number" 
              min="0"
              max="90"
              value={policy.regularization_window_days} 
              onChange={e => setPolicy({...policy, regularization_window_days: e.target.value})}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-primary focus:border-primary sm:text-sm" 
            />
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-100 text-slate-500 sm:text-sm">
              days
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">How many days back an employee is allowed to request a correction.</p>
        </div>

        {/* Note: Entry Methods and Work Week Pattern are simplified for MVP */}

        <div className="flex justify-end pt-4">
          <Button type="submit" isLoading={saving}>Save Policy</Button>
        </div>
      </form>
    </div>
  );
};
