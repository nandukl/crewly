import React from 'react';

export default function BillingStatusBanner({ status }) {
  if (status === 'active' || status === 'trial') return null;

  const isLocked = status === 'locked';

  return (
    <div className={`p-4 rounded-md mb-6 ${isLocked ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {/* Icon could go here */}
          <span className="font-bold">{isLocked ? 'Locked' : 'Grace Period'}</span>
        </div>
        <div className="ml-3">
          <p className="text-sm">
            {isLocked
              ? 'Your organization is locked due to an expired subscription or failed payment. All access is blocked until the subscription is reactivated.'
              : 'Your organization is in a grace period. Access is currently read-only. Please update your payment method to restore full access.'}
          </p>
        </div>
      </div>
    </div>
  );
}
