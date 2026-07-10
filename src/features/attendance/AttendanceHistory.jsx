import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { attendanceService } from '../../lib/attendanceService';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';

export const AttendanceHistory = () => {
  const { activeOrganization } = useOrg();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState(null);

  // Correction Modal State
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    reason: '',
    proposed_clock_in: '',
    proposed_clock_out: '',
    proposed_status: 'Present'
  });

  const loadHistory = async () => {
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

      if (membership) {
        const { data: emp } = await supabase
          .from('employee_profiles')
          .select('id')
          .eq('membership_id', membership.id)
          .single();

        if (emp) {
          setEmployeeId(emp.id);
          const start = new Date();
          start.setDate(start.getDate() - 30); // last 30 days
          const startDate = start.toISOString().split('T')[0];
          const endDate = new Date().toISOString().split('T')[0];
          
          const data = await attendanceService.getRecords(emp.id, startDate, endDate);
          setRecords(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeOrganization]);

  const openCorrection = (record) => {
    setSelectedRecord(record);
    setCorrectionForm({
      reason: '',
      proposed_clock_in: record.clock_in_time ? new Date(record.clock_in_time).toISOString().slice(0, 16) : '',
      proposed_clock_out: record.clock_out_time ? new Date(record.clock_out_time).toISOString().slice(0, 16) : '',
      proposed_status: record.status
    });
    setIsCorrecting(true);
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    try {
      const inTime = correctionForm.proposed_clock_in ? new Date(correctionForm.proposed_clock_in).toISOString() : null;
      const outTime = correctionForm.proposed_clock_out ? new Date(correctionForm.proposed_clock_out).toISOString() : null;
      
      await attendanceService.requestCorrection(
        activeOrganization.id,
        selectedRecord.id,
        employeeId,
        selectedRecord.date,
        {
          reason: correctionForm.reason,
          proposed_clock_in: inTime,
          proposed_clock_out: outTime,
          proposed_status: correctionForm.proposed_status
        }
      );
      setIsCorrecting(false);
      alert('Correction requested successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading history...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-slate-900">My Attendance History (Last 30 Days)</h2>

      {records.length === 0 ? (
        <p className="text-slate-500">No attendance records found.</p>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-slate-300">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Date</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Clock In</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Clock Out</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{r.date}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${r.status === 'Present' ? 'bg-green-100 text-green-800' : r.status === 'Absent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {r.status}
                    </span>
                    {r.is_incomplete && <span className="ml-2 text-xs text-red-500">Incomplete</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {r.clock_in_time ? new Date(r.clock_in_time).toLocaleTimeString() : '--'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {r.clock_out_time ? new Date(r.clock_out_time).toLocaleTimeString() : '--'}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button onClick={() => openCorrection(r)} className="text-primary hover:text-primary-dark">
                      Request Correction
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isCorrecting && (
        <div className="fixed inset-0 bg-slate-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Request Correction for {selectedRecord.date}</h3>
            <form onSubmit={submitCorrection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select 
                  value={correctionForm.proposed_status} 
                  onChange={e => setCorrectionForm({...correctionForm, proposed_status: e.target.value})}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  <option value="Present">Present</option>
                  <option value="Half-Day">Half-Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700">Clock In Time</label>
                <input 
                  type="datetime-local" 
                  value={correctionForm.proposed_clock_in}
                  onChange={e => setCorrectionForm({...correctionForm, proposed_clock_in: e.target.value})}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Clock Out Time</label>
                <input 
                  type="datetime-local" 
                  value={correctionForm.proposed_clock_out}
                  onChange={e => setCorrectionForm({...correctionForm, proposed_clock_out: e.target.value})}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Reason</label>
                <textarea 
                  required
                  value={correctionForm.reason}
                  onChange={e => setCorrectionForm({...correctionForm, reason: e.target.value})}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  rows={3}
                  placeholder="Why are you correcting this entry?"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setIsCorrecting(false)}>Cancel</Button>
                <Button type="submit">Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
