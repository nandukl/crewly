import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { orgService } from '../../lib/orgService';

export const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('orgId');
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing invitation...');

  useEffect(() => {
    const accept = async () => {
      if (!orgId) {
        setStatus('Invalid invitation link.');
        return;
      }
      try {
        await orgService.acceptInvite(orgId);
        setStatus('Invitation accepted! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err) {
        setStatus(`Failed to accept invitation: ${err.message}`);
      }
    };
    accept();
  }, [orgId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded shadow text-center">
        <h2 className="text-xl font-semibold mb-2">Accepting Invitation</h2>
        <p className="text-slate-600">{status}</p>
      </div>
    </div>
  );
};
