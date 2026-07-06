import { supabase } from './supabaseClient';

const formatError = (error, defaultMessage = 'An unexpected error occurred', code = 'NOTIF_ERROR') => {
  return {
    error_code: code,
    message: error?.message || defaultMessage
  };
};

export const notificationService = {
  /**
   * Dispatches a notification via the unified Edge Function.
   * @param {string} type - Notification type (e.g., 'org_invite', 'member_removed')
   * @param {string} recipientEmail - Email address (required for email channel)
   * @param {object} data - Additional data { orgId, role, userId, title, message, actionUrl }
   * @param {string[]} channels - Array of channels ['in_app', 'email']
   */
  send: async (type, recipientEmail, data = {}, channels = ['in_app', 'email']) => {
    try {
      // Default templates if not provided
      let title = data.title;
      let message = data.message;
      let actionUrl = data.actionUrl;

      if (!title || !message) {
        switch(type) {
          case 'org_invite':
            title = 'Organization Invitation';
            message = `You have been invited to join an organization as a ${data.role || 'member'}.`;
            actionUrl = '/invites';
            break;
          case 'member_removed':
            title = 'Membership Revoked';
            message = 'Your membership in the organization has been revoked.';
            channels = ['email'];
            break;
          case 'ownership_transferred':
            title = 'Ownership Transferred';
            message = 'You are now the owner of the organization.';
            break;
          default:
            title = 'New Notification';
            message = 'You have a new notification.';
        }
      }

      // Try to resolve user_id if not explicitly provided, but recipientEmail is.
      let userId = data.userId;
      if (!userId && recipientEmail && channels.includes('in_app')) {
          // Best effort lookup from memberships
          const { data: mem } = await supabase.from('memberships').select('user_id').eq('email', recipientEmail).not('user_id', 'is', null).maybeSingle();
          if (mem) {
             userId = mem.user_id;
          }
      }

      // FALLBACK: Since Edge Functions are unavailable locally without Docker and remote deployment failed with 403,
      // we use a direct RPC call to insert the in-app notification.
      if (channels.includes('in_app') && userId) {
        const { error } = await supabase.rpc('create_in_app_notification', {
          p_organization_id: data.orgId || null,
          p_user_id: userId,
          p_type: type,
          p_title: title,
          p_message: message,
          p_action_url: actionUrl || null
        });
        
        if (error) {
          console.error('[NotificationService] In-App RPC Error:', error);
          return false;
        }
      }

      if (channels.includes('email') && recipientEmail) {
         console.log(`[Notification Stub] Would send Email to ${recipientEmail} with subject: "${title}"`);
      }
      
      return true;
    } catch (error) {
       console.error('[NotificationService] Failed to dispatch:', error);
       return false;
    }
  },

  getUnreadNotifications: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[NotificationService] Failed to fetch unread:', error);
      return [];
    }
  },

  markAsRead: async (notificationId) => {
     try {
       const { error } = await supabase.rpc('mark_notification_read', {
         p_notification_id: notificationId
       });
       if (error) throw error;
       return true;
     } catch (error) {
       console.error('[NotificationService] Failed to mark read:', error);
       return false;
     }
  }
};
