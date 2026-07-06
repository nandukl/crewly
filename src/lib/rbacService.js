import { supabase } from './supabaseClient';
import { auditLog } from './auditLog';
import { notificationService } from './notificationService';

const formatError = (error, defaultMessage = 'An unexpected error occurred', code = 'RBAC_ERROR') => {
  return {
    error_code: code,
    message: error?.message || defaultMessage,
    correlation_id: crypto.randomUUID(),
    field_errors: error?.field_errors || null
  };
};

export const rbacService = {
  can: async (orgId, action, resourceType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: user.id,
        p_org_id: orgId,
        p_resource_type: resourceType,
        p_action: action
      });

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Permission check failed:', error);
      // Fail closed
      return false; 
    }
  },

  getCustomRoles: async (orgId) => {
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select(`
          *,
          permission_grants (*)
        `)
        .eq('organization_id', orgId);
        
      if (error) throw error;
      return data;
    } catch (error) {
      throw formatError(error, 'Failed to fetch custom roles', 'RBAC_FETCH_ROLES_ERROR');
    }
  },

  createCustomRole: async (orgId, name, description, grants) => {
    try {
      if (!grants || grants.length === 0) {
        throw new Error('A custom role must have at least one permission grant.');
      }

      const { data: roleId, error } = await supabase.rpc('create_custom_role', {
        p_org_id: orgId,
        p_name: name,
        p_description: description,
        p_grants: grants
      });

      if (error) throw error;
      return { id: roleId, name, description, permission_grants: grants };
    } catch (error) {
      throw formatError(error, 'Failed to create custom role', 'RBAC_CREATE_ROLE_ERROR');
    }
  },

  updateCustomRole: async (orgId, roleId, name, description, grants) => {
    try {
      if (!grants || grants.length === 0) {
        throw new Error('A custom role must have at least one permission grant.');
      }

      const { error } = await supabase.rpc('update_custom_role', {
        p_org_id: orgId,
        p_role_id: roleId,
        p_name: name,
        p_description: description,
        p_grants: grants
      });

      if (error) throw error;
      return { id: roleId, name, description, permission_grants: grants };
    } catch (error) {
      throw formatError(error, 'Failed to update custom role', 'RBAC_UPDATE_ROLE_ERROR');
    }
  },

  deleteCustomRole: async (orgId, roleId) => {
    try {
      const { error } = await supabase.rpc('delete_custom_role', {
        p_org_id: orgId,
        p_role_id: roleId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      throw formatError(error, 'Failed to delete custom role', 'RBAC_DELETE_ROLE_ERROR');
    }
  },

  getMembershipCustomRoles: async (orgId, membershipId) => {
    try {
      const { data, error } = await supabase
        .from('membership_custom_roles')
        .select(`
          custom_role_id,
          custom_roles ( name, description )
        `)
        .eq('membership_id', membershipId);

      if (error) throw error;
      return data;
    } catch (error) {
      throw formatError(error, 'Failed to fetch membership roles', 'RBAC_FETCH_MEMBERSHIP_ROLES_ERROR');
    }
  },

  assignCustomRolesToMembership: async (orgId, membershipId, customRoleIds) => {
    try {
      // 1. Calculate added/removed for notifications
      const { data: existing } = await supabase
        .from('membership_custom_roles')
        .select('custom_role_id')
        .eq('membership_id', membershipId);
      
      const existingIds = existing?.map(e => e.custom_role_id) || [];
      const toAdd = customRoleIds.filter(id => !existingIds.includes(id));
      const toRemove = existingIds.filter(id => !customRoleIds.includes(id));

      // 2. Atomic Assignment via RPC
      const { error } = await supabase.rpc('assign_membership_roles', {
        p_org_id: orgId,
        p_membership_id: membershipId,
        p_custom_role_ids: customRoleIds
      });
      if (error) throw error;

      // 3. Notifications (Audit log is handled by RPC)
      const { data: mem } = await supabase.from('memberships').select('email').eq('id', membershipId).single();
      if (mem) {
        if (toAdd.length > 0) await notificationService.send('roles_assigned', mem.email, { orgId, count: toAdd.length });
        if (toRemove.length > 0) await notificationService.send('roles_removed', mem.email, { orgId, count: toRemove.length });
      }

      return true;
    } catch (error) {
      throw formatError(error, 'Failed to update membership custom roles', 'RBAC_ASSIGN_ROLES_ERROR');
    }
  }
};
