import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { attendanceService } from '../../lib/attendanceService';
import { Button } from '../../components/ui/Button';

export const CorrectionRequests = () => {
  const { activeOrganization } = useOrg();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reject Modal
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadRequests = async () => {
    if (!activeOrganization) return;
    try {
      setLoading(true);
      const data = await attendanceService.getPendingCorrections(activeOrganization.id);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [activeOrganization]);

  const handleApprove = async (id) => {
    try {
      await attendanceService.approveCorrection(id);
      alert('Correction approved.');
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const openReject = (req) => {
    setSelectedRequest(req);
    setRejectionReason('');
    setIsRejecting(true);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await attendanceService.rejectCorrection(selectedRequest.id, rejectionReason);
      alert('Correction rejected.');
      setIsRejecting(false);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading requests...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-slate-900">Pending Corrections</h2>

      {requests.length === 0 ? (
        <p className="text-slate-500">No pending corrections to review.</p>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">
                    {req.employee_profiles?.full_name}
                  </span>
                  <span className="text-sm text-slate-500">for {req.date}</span>
                </div>
                
                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                  <strong>Reason:</strong> {req.reason}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div>
                    <span className="text-slate-500 block">Proposed In:</span>
                    <span className="font-medium">{req.proposed_clock_in ? new Date(req.proposed_clock_in).toLocaleTimeString() : '--'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Proposed Out:</span>
                    <span className="font-medium">{req.proposed_clock_out ? new Date(req.proposed_clock_out).toLocaleTimeString() : '--'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Proposed Status:</span>
                    <span className="font-medium">{req.proposed_status}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                <Button variant="secondary" onClick={() => openReject(req)} className="flex-1 sm:flex-none">Reject</Button>
                <Button onClick={() => handleApprove(req.id)} className="flex-1 sm:flex-none">Approve</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isRejecting && (
        <div className="fixed inset-0 bg-slate-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Reject Correction</h3>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Rejection Reason</label>
                <textarea 
                  required
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  rows={3}
                  placeholder="Explain why this request is denied..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setIsRejecting(false)}>Cancel</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">Reject Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
