import React, { useState, useEffect } from 'react';
import { billingService } from '../../../lib/billingService';

export default function SuperAdminBillingOverride({ orgId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!orgId) return;

    let mounted = true;
    
    async function loadStatus() {
      setLoading(true);
      const { data, error_code } = await billingService.getSubscriptionStatus(orgId);
      
      if (mounted) {
        if (data) {
          setStatus(data.status);
        } else {
          setMessage({ type: 'error', text: `Failed to load status: ${error_code}` });
        }
        setLoading(false);
      }
    }

    loadStatus();

    return () => {
      mounted = false;
    };
  }, [orgId]);

  const handleUpdate = async (newStatus) => {
    setUpdating(true);
    setMessage(null);

    const { data, error_code, message: errMsg } = await billingService.updateSubscriptionStatus(orgId, newStatus);
    
    if (data) {
      setStatus(data.status);
      setMessage({ type: 'success', text: `Successfully updated status to ${newStatus}` });
    } else {
      setMessage({ type: 'error', text: `Failed to update: ${error_code} - ${errMsg || ''}` });
    }
    
    setUpdating(false);
  };

  if (!orgId) return null;
  if (loading) return <div className="p-4 border rounded shadow-sm text-sm text-gray-500">Loading Dev Tools...</div>;

  return (
    <div className="p-4 border border-dashed border-purple-500 bg-purple-50 rounded shadow-sm mt-8">
      <h3 className="text-lg font-bold text-purple-900 mb-2">Dev Tools: Billing Override (Super Admin Only)</h3>
      <p className="text-sm text-purple-700 mb-4">
        Manually override the subscription status for testing purposes. Real Module 2 will handle this automatically.
      </p>
      
      {message && (
        <div className={`p-2 mb-4 text-sm rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        {['trial', 'grace_period', 'locked', 'active'].map((s) => (
          <button
            key={s}
            onClick={() => handleUpdate(s)}
            disabled={updating || status === s}
            className={`px-3 py-1.5 text-sm font-medium rounded border ${
              status === s 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'
            } disabled:opacity-50`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
