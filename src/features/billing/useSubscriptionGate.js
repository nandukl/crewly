import { useOrg } from '../org/OrgContext';

export const useSubscriptionGate = () => {
  const { subscriptionStatus, isSubscriptionLocked, isSubscriptionGracePeriod } = useOrg();

  const canWrite = !isSubscriptionLocked && !isSubscriptionGracePeriod;

  const checkWriteAccess = () => {
    if (isSubscriptionLocked) {
      alert('Your organization is locked. Write access is disabled.');
      return false;
    }
    if (isSubscriptionGracePeriod) {
      alert('Your organization is in a grace period. Write access is disabled.');
      return false;
    }
    return true;
  };

  return {
    status: subscriptionStatus,
    isLocked: isSubscriptionLocked,
    isGracePeriod: isSubscriptionGracePeriod,
    canWrite,
    checkWriteAccess
  };
};
