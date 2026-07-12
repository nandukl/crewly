import { supabase } from './supabaseClient';
import { auditLog } from './auditLog';

export const adminService = {
  /**
   * Fetches all organizations on the platform.
   * Only accessible to Super Admins.
   */
  async getPlatformOrganizations() {
    try {
      const { data, error } = await supabase.rpc('get_platform_organizations');
      if (error) throw error;
      return { data };
    } catch (err) {
      console.error('[AdminService] Error fetching organizations:', err);
      return { error_code: 'FETCH_ERROR', message: err.message, data: [] };
    }
  },

  /**
   * Manually updates the subscription status of any organization globally.
   * RLS strictly enforces that only Super Admins can execute this update on the subscriptions table.
   */
  async updatePlatformSubscription(orgId, status) {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        return { error_code: 'UNAUTHORIZED', message: 'Not authenticated.' };
      }

      // The subscriptions table already allows Super Admins to update any row due to the RLS policy defined in Module 2.
      const { error } = await supabase
        .from('subscriptions')
        .update({ status, updated_at: new Date().toISOString(), updated_by: userData.user.id })
        .eq('organization_id', orgId);

      if (error) throw error;

      // Ensure it gets audited logically (even though the DB trigger will also catch it)
      await auditLog.record(
        'GLOBAL_SUBSCRIPTION_OVERRIDE',
        userData.user.id,
        { new_status: status, is_global_override: true },
        orgId,
        'subscription',
        orgId
      );

      return { success: true };
    } catch (err) {
      console.error('[AdminService] Error updating subscription:', err);
      return { error_code: 'UPDATE_FAILED', message: err.message };
    }
  },

  /**
   * Archives an organization, effectively soft-deleting it from the platform.
   */
  async archiveOrganization(orgId) {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        return { error_code: 'UNAUTHORIZED', message: 'Not authenticated.' };
      }

      const { error } = await supabase.rpc('archive_platform_organization', { p_org_id: orgId });
      if (error) throw error;

      await auditLog.record(
        'GLOBAL_ORG_ARCHIVED',
        userData.user.id,
        { is_global_override: true },
        orgId,
        'organization',
        orgId
      );

      return { success: true };
    } catch (err) {
      console.error('[AdminService] Error archiving org:', err);
      return { error_code: 'ARCHIVE_FAILED', message: err.message };
    }
  },

  async getSystemUsers() {
    try {
      const { data, error } = await supabase.rpc('get_system_users');
      if (error) throw error;
      return { data };
    } catch (err) {
      console.error('[AdminService] Error fetching system users:', err);
      return { error_code: 'FETCH_ERROR', message: err.message, data: [] };
    }
  }
};
