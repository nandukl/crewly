import { supabase } from './supabaseClient';
import { auditLog } from './auditLog';

export const billingService = {
  /**
   * Fetches the current subscription status for an organization.
   * RLS will naturally block this if the user doesn't have an active membership.
   */
  async getSubscriptionStatus(orgId) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, trial_started_at, trial_ends_at, grace_ends_at')
        .eq('organization_id', orgId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { error_code: 'NOT_FOUND', message: 'Subscription record not found.' };
        }
        return { error_code: 'DB_ERROR', message: error.message };
      }

      return { data };
    } catch (err) {
      return { error_code: 'UNKNOWN_ERROR', message: err.message };
    }
  },

  /**
   * Manually updates the subscription status (Admin/Dev override only).
   * RLS strictly enforces that only Super Admins can execute this.
   */
  async updateSubscriptionStatus(orgId, status) {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        return { error_code: 'UNAUTHORIZED', message: 'Not authenticated.' };
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status, updated_at: new Date().toISOString(), updated_by: userData.user.id })
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) {
        return { error_code: 'UPDATE_FAILED', message: error.message };
      }

      // Record in audit log
      await auditLog.record(
        'SUBSCRIPTION_STATUS_CHANGED', 
        userData.user.id, 
        { new_status: status, is_manual_override: true },
        orgId,
        'subscription',
        orgId
      );

      return { data };
    } catch (err) {
      return { error_code: 'UNKNOWN_ERROR', message: err.message };
    }
  }
};
