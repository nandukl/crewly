import { supabase } from './supabaseClient';

export const auditLog = {
  /**
   * Records a platform event via the manual frontend RPC.
   * Note: Backend table mutations are now automatically logged via PostgreSQL triggers,
   * so this is primarily for Auth, Billing, and higher-level logical events.
   * 
   * @param {string} eventType - The action being logged
   * @param {string} userId - ID of the user performing the action
   * @param {object} metadata - Arbitrary JSON payload
   * @param {string} organizationId - Optional: Link this event to a specific tenant
   * @param {string} entityType - Optional: What kind of object this is
   * @param {string} entityId - Optional: ID of the object
   */
  record: async (eventType, userId, metadata = {}, organizationId = null, entityType = null, entityId = null) => {
    try {
      const { error } = await supabase.rpc('record_audit_log', {
        p_event_type: eventType,
        p_user_id: userId || null,
        p_metadata: metadata,
        p_organization_id: organizationId,
        p_entity_type: entityType,
        p_entity_id: entityId
      });
      
      if (error) {
        console.error('[AuditLog] Failed to record:', error);
      }
    } catch (err) {
      console.error('[AuditLog] Network/Client error:', err);
    }
  },

  /**
   * Fetches the audit logs for a specific organization.
   * Enforced via RLS: Only Org Owners & Admins can successfully query this.
   */
  getOrgAuditLogs: async (orgId) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[AuditLog] Fetch failed:', err);
      return [];
    }
  }
};
