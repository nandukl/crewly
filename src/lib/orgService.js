import { supabase } from './supabaseClient';
import { auditLog } from './auditLog';
import { notificationService } from './notificationService';

const formatError = (error, defaultMessage = 'An unexpected error occurred', code = 'ORG_ERROR') => {
  return {
    error_code: code,
    message: error?.message || defaultMessage,
    correlation_id: crypto.randomUUID(),
    field_errors: error?.field_errors || null
  };
};

export const orgService = {
  getOrganizations: async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          memberships!inner(
            *,
            membership_custom_roles(
              custom_role_id,
              custom_roles(name)
            )
          )
        `)
        .eq('memberships.status', 'active');
        
      if (error) throw error;
      return data;
    } catch (error) {
      throw formatError(error, 'Failed to fetch organizations', 'ORG_FETCH_ERROR');
    }
  },

  createOrganization: async (name, slug) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check slug collision
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingOrg) {
        throw new Error('Slug is already in use. Please choose another.');
      }

      // Use atomic RPC for creating org + owner membership + updating last_active_org_id
      const orgId = crypto.randomUUID();
      const { error: rpcError } = await supabase.rpc('create_organization', {
        p_org_id: orgId,
        p_name: name,
        p_slug: slug,
        p_user_id: user.id,
        p_email: user.email
      });

      if (rpcError) throw rpcError;

      // Now we can fetch it safely
      const { data: newOrg } = await supabase.from('organizations').select('*').eq('id', orgId).single();

      return newOrg;
    } catch (error) {
      throw formatError(error, 'Failed to create organization', 'ORG_CREATE_ERROR');
    }
  },

  updateOrganization: async (id, data) => {
    try {
      if (data.slug) {
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', data.slug)
          .neq('id', id)
          .maybeSingle();

        if (existingOrg) {
          throw new Error('Slug is already in use. Please choose another.');
        }
      }

      const { error } = await supabase.rpc('update_organization', {
        p_org_id: id,
        p_updates: data
      });

      if (error) throw error;
      
      // Fetch the updated org to return
      const { data: updatedOrg } = await supabase.from('organizations').select('*').eq('id', id).single();
      
      return updatedOrg;
    } catch (error) {
      throw formatError(error, 'Failed to update organization', 'ORG_UPDATE_ERROR');
    }
  },

  inviteMember: async (orgId, email, role) => {
    try {
      const { data: membershipId, error } = await supabase.rpc('invite_member', {
        p_org_id: orgId,
        p_email: email,
        p_role: role
      });

      if (error) throw error;
      
      await notificationService.send('org_invite', email, { role, orgId });

      return { id: membershipId, organization_id: orgId, email, role, status: 'pending_invitation' };
    } catch (error) {
      throw formatError(error, 'Failed to invite member', 'MEMBER_INVITE_ERROR');
    }
  },

  acceptInvite: async (orgId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('accept_invitation', {
        p_org_id: orgId
      });

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      throw formatError(error, 'Failed to accept invitation', 'INVITE_ACCEPT_ERROR');
    }
  },

  getPendingInvitations: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('memberships')
        .select(`
          organization_id,
          role,
          organizations(name, slug)
        `)
        .eq('email', user.email)
        .eq('status', 'pending_invitation');

      if (error) throw error;
      return data;
    } catch (error) {
      throw formatError(error, 'Failed to fetch pending invitations', 'INVITES_FETCH_ERROR');
    }
  },

  updateMembershipStatus: async (membershipId, status) => {
    try {
      const { error } = await supabase.rpc('update_membership_status', {
        p_membership_id: membershipId,
        p_status: status
      });

      if (error) throw error;
      
      if (status === 'removed') {
         // Best effort to get the email/org to send the notification
         const { data: mem } = await supabase.from('memberships').select('email, organization_id').eq('id', membershipId).maybeSingle();
         if (mem) {
           await notificationService.send('member_removed', mem.email, { orgId: mem.organization_id });
         }
      }

      return { id: membershipId, status };
    } catch (error) {
      throw formatError(error, 'Failed to update membership status', 'MEMBERSHIP_UPDATE_ERROR');
    }
  },

  transferOwnership: async (orgId, newOwnerMembershipId) => {
    try {
      const { error } = await supabase.rpc('transfer_org_ownership', {
        p_org_id: orgId,
        p_new_owner_membership_id: newOwnerMembershipId
      });

      if (error) throw error;
      
      const { data: mem } = await supabase.from('memberships').select('email').eq('id', newOwnerMembershipId).single();
      if (mem) {
        await notificationService.send('ownership_transferred', mem.email, { orgId });
      }

      return { success: true };
    } catch (error) {
      throw formatError(error, 'Failed to transfer ownership', 'OWNERSHIP_TRANSFER_ERROR');
    }
  },

  getStructureNodes: async (orgId) => {
    try {
      const { data, error } = await supabase
        .from('structure_nodes')
        .select('*')
        .eq('organization_id', orgId);

      if (error) throw error;
      return data;
    } catch (error) {
      throw formatError(error, 'Failed to fetch structure nodes', 'STRUCTURE_FETCH_ERROR');
    }
  },

  createStructureNode: async (orgId, parentId, name, type) => {
    try {
      const { data: nodeId, error } = await supabase.rpc('create_structure_node', {
        p_org_id: orgId,
        p_parent_id: parentId || null,
        p_name: name,
        p_type: type
      });

      if (error) throw error;

      return { id: nodeId, organization_id: orgId, parent_id: parentId || null, name, type };
    } catch (error) {
      throw formatError(error, 'Failed to create structure node', 'STRUCTURE_CREATE_ERROR');
    }
  },

  updateStructureNode: async (nodeId, updates) => {
    try {
      const { error } = await supabase.rpc('update_structure_node', {
        p_node_id: nodeId,
        p_name: updates.name || null,
        p_type: updates.type || null
      });

      if (error) throw error;

      return { id: nodeId, ...updates };
    } catch (error) {
      throw formatError(error, 'Failed to update structure node', 'STRUCTURE_UPDATE_ERROR');
    }
  },

  archiveStructureNode: async (nodeId) => {
    try {
      const { error } = await supabase.rpc('archive_structure_node', {
        p_node_id: nodeId
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      throw formatError(error, 'Failed to archive structure node', 'STRUCTURE_ARCHIVE_ERROR');
    }
  }
};
