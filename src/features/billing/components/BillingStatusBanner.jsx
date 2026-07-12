import React from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '../../../features/org/OrgContext';

export default function BillingStatusBanner({ status }) {
  if (status === 'active' || status === 'trial') return null;

  const isLocked = status === 'locked';
  
  // Use a muted version of alert-red for grace period, bright alert-red for locked
  const bgColor = isLocked ? 'bg-[#C4453A]' : 'bg-[#C4453A]/80';

  return (
    <div className={`w-full ${bgColor} px-4 py-3 flex items-center justify-between text-white shadow-sm`}>
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[18px]">
          {isLocked ? 'lock' : 'warning'}
        </span>
        <span className="font-label-md uppercase tracking-widest text-[11px]">
          {isLocked 
            ? 'Account locked. Reactivate subscription to restore access.' 
            : 'Your trial ended. Read-only until you add a payment method.'}
        </span>
      </div>
      <Link 
        to="/dashboard" 
        state={{ tab: 'billing' }}
        onClick={(e) => {
          // If already in dashboard, this forces state update or we might just use an href fallback
          // Ideally, the user clicks this and switches tab
        }}
        className="font-label-md uppercase tracking-widest text-[10px] bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-sm"
      >
        Go to Billing
      </Link>
    </div>
  );
}
