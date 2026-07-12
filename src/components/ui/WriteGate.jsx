import React, { useState } from 'react';
import { useOrg } from '../../features/org/OrgContext';

/**
 * Wraps action elements (like buttons) to disable them and show a warning
 * if the organization's subscription is locked or in a grace period.
 */
export const WriteGate = ({ children, fallback }) => {
  const { isSubscriptionLocked, isSubscriptionGracePeriod } = useOrg();
  const [showTooltip, setShowTooltip] = useState(false);

  const isProtected = isSubscriptionLocked || isSubscriptionGracePeriod;

  if (!isProtected) {
    return <>{children}</>;
  }

  // If a custom fallback is provided, render it instead of the default behavior
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div 
      className="relative inline-block cursor-not-allowed"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClickCapture={(e) => {
        // Prevent all click events from reaching the wrapped element
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-slate-900 text-white text-xs rounded shadow-lg z-50 pointer-events-none">
          {isSubscriptionLocked 
            ? 'Action disabled: Organization is locked.' 
            : 'Action disabled: Subscription grace period.'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
};
