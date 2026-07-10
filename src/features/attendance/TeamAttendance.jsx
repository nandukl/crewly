import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { supabase } from '../../lib/supabaseClient';

export const TeamAttendance = () => {
  const { activeOrganization } = useOrg();
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const loadTeamAttendance = async () => {
    if (!activeOrganization) return;
    try {
      setLoading(true);
      // Fetch all employees in org
      const { data: emps, error: empErr } = await supabase
        .from('employee_profiles')
        .select('id, first_name, last_name')
        .eq('organization_id', activeOrganization.id)
        .order('first_name');

      if (empErr) throw empErr;

      // Fetch attendance records for the selected date
      const { data: records, error: recErr } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('organization_id', activeOrganization.id)
        .eq('date', date);

      if (recErr) throw recErr;

      // Merge
      const merged = emps.map(emp => {
        const record = records.find(r => r.employee_id === emp.id);
        return {
          ...emp,
          record
        };
      });

      setEmployees(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamAttendance();
  }, [activeOrganization, date]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-medium text-slate-900">Team Attendance</h2>
        <div>
          <label className="sr-only">Date</label>
          <input 
            type="date" 
            value={date}
            onChange={e => setDate(e.target.value)}
            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
          />
        </div>
      </div>

      {loading ? (
        <div>Loading team attendance...</div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-slate-300">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Employee</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Clock In</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Clock Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {emp.record ? (
                      <>
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${emp.record.status === 'Present' ? 'bg-green-100 text-green-800' : emp.record.status === 'Absent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {emp.record.status}
                        </span>
                        {emp.record.is_incomplete && <span className="ml-2 text-xs text-red-500">Incomplete</span>}
                      </>
                    ) : (
                      <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-slate-100 text-slate-800">
                        No Entry
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {emp.record?.clock_in_time ? new Date(emp.record.clock_in_time).toLocaleTimeString() : '--'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {emp.record?.clock_out_time ? new Date(emp.record.clock_out_time).toLocaleTimeString() : '--'}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-slate-500">No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
