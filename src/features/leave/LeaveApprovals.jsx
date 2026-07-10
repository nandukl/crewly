import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { leaveService } from '../../lib/leaveService';
import { Button } from '../../components/ui/Button';

export const LeaveApprovals = () => {
  const { activeOrganization } = useOrg();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    if (!activeOrganization) return;
    try {
      setLoading(true);
      const data = await leaveService.getPendingRequests(activeOrganization.id);
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeOrganization]);

  const handleApprove = async (id) => {
    try {
      await leaveService.approveRequest(id);
      await fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      await leaveService.rejectRequest(id, reason);
      await fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="py-8">Loading approval queue...</div>;
  if (error) return <div className="py-8 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pending Approvals</h2>
          <p className="text-sm text-slate-500 mt-1">Review and approve employee leave requests.</p>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-slate-200">
          {requests.map((req) => (
            <li key={req.id} className="p-4 sm:px-6 hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                      {req.employee_profiles?.full_name?.charAt(0) || '?'}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">
                      {req.employee_profiles?.full_name || 'Unknown User'} 
                      <span className="font-normal text-slate-500 ml-1">({req.employee_profiles?.email})</span>
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-medium text-indigo-600">{req.leave_types?.name}</span>
                      <span>&bull;</span>
                      <span>{req.days_count} Days</span>
                      <span>&bull;</span>
                      <span>{new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                      "{req.reason}"
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handleReject(req.id)} className="text-red-600 hover:text-red-700">Reject</Button>
                  <Button onClick={() => handleApprove(req.id)}>Approve</Button>
                </div>
              </div>
            </li>
          ))}
          {requests.length === 0 && (
            <li className="p-8 text-center text-slate-500">No pending requests to review.</li>
          )}
        </ul>
      </div>
    </div>
  );
};
