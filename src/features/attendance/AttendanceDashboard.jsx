import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { attendanceService } from '../../lib/attendanceService';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';

export const AttendanceDashboard = () => {
  const { activeOrganization } = useOrg();
  const [employeeId, setEmployeeId] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContext = async () => {
      if (!activeOrganization) return;
      try {
        setLoading(true);
        // Get current user's employee_profile
        const { data: { user } } = await supabase.auth.getUser();
        const { data: membership } = await supabase
          .from('memberships')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', activeOrganization.id)
          .single();

        if (!membership) {
          setError("No membership found.");
          setLoading(false);
          return;
        }

        const { data: emp, error: empErr } = await supabase
          .from('employee_profiles')
          .select('id')
          .eq('membership_id', membership.id)
          .single();
        
        if (empErr || !emp) {
          setError("No employee profile found for your user in this organization.");
          setLoading(false);
          return;
        }
        
        setEmployeeId(emp.id);

        const today = new Date().toISOString().split('T')[0];
        const records = await attendanceService.getRecords(emp.id, today, today);
        if (records.length > 0) {
          setTodayRecord(records[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  }, [activeOrganization]);

  const handleClockIn = async () => {
    try {
      setError(null);
      const record = await attendanceService.clockIn(activeOrganization.id, employeeId);
      setTodayRecord(record);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClockOut = async () => {
    try {
      setError(null);
      const record = await attendanceService.clockOut(employeeId);
      setTodayRecord(record);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;
  if (error && !employeeId) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-slate-900">Today's Attendance</h2>
      
      {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded">{error}</div>}

      <div className="bg-slate-50 p-6 rounded border border-slate-200 flex flex-col items-center justify-center space-y-4">
        <div className="text-3xl font-light text-slate-700">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        
        <div className="flex gap-4 mt-6">
          <Button 
            onClick={handleClockIn} 
            disabled={todayRecord && !!todayRecord.clock_in_time}
            className="w-32 py-3"
          >
            Clock In
          </Button>
          <Button 
            onClick={handleClockOut} 
            disabled={!todayRecord || !todayRecord.clock_in_time || !!todayRecord.clock_out_time}
            variant="secondary"
            className="w-32 py-3 bg-white"
          >
            Clock Out
          </Button>
        </div>

        {todayRecord && (
          <div className="mt-6 w-full max-w-sm text-sm text-slate-600 space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium text-slate-900">{todayRecord.status}</span>
            </div>
            <div className="flex justify-between">
              <span>Clock In:</span>
              <span className="font-medium text-slate-900">
                {todayRecord.clock_in_time ? new Date(todayRecord.clock_in_time).toLocaleTimeString() : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Clock Out:</span>
              <span className="font-medium text-slate-900">
                {todayRecord.clock_out_time ? new Date(todayRecord.clock_out_time).toLocaleTimeString() : '--'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
