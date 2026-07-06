import { supabase } from './supabaseClient';
import { auditLog } from './auditLog';
import { notificationService } from './notificationService';

const generateDeviceFingerprint = async () => {
  const userAgent = navigator.userAgent;
  let ipPrefix = 'unknown';
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    ipPrefix = data.ip ? data.ip.split('.').slice(0, 3).join('.') : 'unknown';
  } catch (e) {
    // Ignore, use unknown
  }
  
  const msgUint8 = new TextEncoder().encode(`${userAgent}-${ipPrefix}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const decodeJwtSessionId = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    return payload.session_id;
  } catch (e) {
    return null;
  }
};

const recordSession = async (user, session, email) => {
  const fingerprint = await generateDeviceFingerprint();
  const { data: existingSessions } = await supabase
    .from('user_sessions_tracker')
    .select('session_id')
    .eq('user_id', user.id)
    .eq('device_fingerprint', fingerprint)
    .eq('is_revoked', false);

  if (!existingSessions || existingSessions.length === 0) {
    await notificationService.send('new_device_login', email, { fingerprint, userAgent: navigator.userAgent });
  }

  const nativeSessionId = decodeJwtSessionId(session.access_token);
  if (nativeSessionId) {
    await supabase.from('user_sessions_tracker').upsert({
      session_id: nativeSessionId,
      user_id: user.id,
      device_fingerprint: fingerprint,
      user_agent: navigator.userAgent,
      ip_address: 'client-ip',
    });
  }
  
  await auditLog.record('USER_LOGIN_SUCCESS', user.id, { email, session_id: nativeSessionId });
};

const formatError = (error, defaultMessage = 'An unexpected error occurred', code = 'AUTH_ERROR') => {
  return {
    error_code: code,
    message: error?.message || defaultMessage,
    correlation_id: crypto.randomUUID(),
    field_errors: error?.field_errors || null
  };
};

export const authService = {
  getCurrentSessionId: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? decodeJwtSessionId(session.access_token) : null;
  },

  /**
   * Signup utilizing the Edge Function to enforce server-side complexity
   */
  signup: async (email, password) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-signup', {
        body: { email, password }
      });

      if (error || (data && data.error)) {
         throw new Error(error?.message || data?.error || 'Signup failed');
      }

      await auditLog.record('USER_SIGNUP', data?.user?.id, { email });
      return data;
    } catch (error) {
      await auditLog.record('USER_SIGNUP_FAILED', null, { email, error: error.message });
      throw formatError(error, 'An account with this email may already exist or another issue occurred.', 'SIGNUP_ERROR');
    }
  },

  /**
   * Login with lockout check and device fingerprinting
   */
  login: async (email, password) => {
    try {
      // 1. Pre-check lockout
      const { data: isLocked, error: lockoutCheckError } = await supabase.rpc('check_lockout', { p_email: email });
      if (lockoutCheckError) throw lockoutCheckError;
      if (isLocked) {
        throw new Error('Account is temporarily locked due to too many failed attempts. Please try again later.');
      }

      // 2. Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Record failure
        await supabase.rpc('record_failed_login', { p_email: email, p_max_attempts: 5, p_lockout_minutes: 15 });
        await auditLog.record('USER_LOGIN_FAILED', null, { email });
        throw error;
      }

      // Check if email is verified
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        throw new Error('Please verify your email before logging in.');
      }

      // 3. Reset lockout on success
      await supabase.rpc('reset_failed_login', { p_user_id: data.user.id });

      // 4. Record session if fully logged in
      if (data.session) {
        await recordSession(data.user, data.session, email);
      }
      
      return data;
    } catch (error) {
      throw formatError(error, 'Login failed', 'LOGIN_ERROR');
    }
  },

  logout: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
           const sessionId = decodeJwtSessionId(session.access_token);
           if (sessionId) {
             await supabase.from('user_sessions_tracker').update({ is_revoked: true }).eq('session_id', sessionId);
           }
           await auditLog.record('USER_LOGOUT', user.id);
        }
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw formatError(error, 'Logout failed', 'LOGOUT_ERROR');
    }
  },

  forgotPassword: async (email) => {
    try {
      // Supabase handles anti-enumeration natively if not leaking errors,
      // but we force a generic response regardless of success or failure.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      await auditLog.record('PASSWORD_RESET_REQUESTED', null, { email });
      // Always return success to prevent enumeration
      return { success: true, message: 'If an account exists for this email, a reset link has been sent.' };
    } catch (error) {
      // Still return success for anti-enumeration
      return { success: true, message: 'If an account exists for this email, a reset link has been sent.' };
    }
  },

  resetPassword: async (newPassword) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Invalid or expired reset session.');

      // The backend should ideally validate complexity here too, but for v1 we rely on client/Supabase native
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await auditLog.record('PASSWORD_RESET_COMPLETED', user.id);

      // Invalidate all existing sessions
      await supabase.from('user_sessions_tracker').update({ is_revoked: true }).eq('user_id', user.id);
      
      // Also sign out locally so they have to log in with new password
      await authService.logout();

      return { success: true };
    } catch (error) {
      throw formatError(error, 'Failed to reset password', 'RESET_ERROR');
    }
  },

  checkMfaEnrollment: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;

      // Check if user is super admin
      const { data: profile } = await supabase.from('user_profiles').select('is_super_admin').eq('id', user.id).single();

      return {
        aal: data,
        isEnrolled: data.nextLevel === 'aal2',
        isSuperAdmin: profile?.is_super_admin || false
      };
    } catch (error) {
      throw formatError(error, 'Failed to check MFA status', 'MFA_CHECK_ERROR');
    }
  },

  enrollMfa: async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await auditLog.record('MFA_ENROLLMENT_STARTED', user?.id, { factorId: data.id });
      
      return data;
    } catch (error) {
      throw formatError(error, 'Failed to enroll in MFA', 'MFA_ENROLL_ERROR');
    }
  },

  verifyMfaEnrollment: async (factorId, code) => {
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code
      });
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await auditLog.record('MFA_ENROLLMENT_COMPLETED', user?.id, { factorId });

      return data;
    } catch (error) {
      throw formatError(error, 'Failed to verify MFA code', 'MFA_VERIFY_ERROR');
    }
  },

  challengeMfa: async (factorId, code) => {
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code
      });
      if (error) throw error;

      const { data: { user, session } } = await supabase.auth.getSession();
      await auditLog.record('MFA_CHALLENGE_SUCCESS', user?.id, { factorId });

      if (user && session) {
        await recordSession(user, session, user.email);
      }

      return data;
    } catch (error) {
      const { data: { user } } = await supabase.auth.getUser();
      await auditLog.record('MFA_CHALLENGE_FAILED', user?.id, { factorId });
      throw formatError(error, 'Invalid MFA code', 'MFA_CHALLENGE_ERROR');
    }
  },
  
  getActiveSessions: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_sessions_tracker')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_revoked', false)
        .order('last_active', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      throw formatError(error, 'Failed to fetch active sessions', 'SESSION_FETCH_ERROR');
    }
  },

  revokeSession: async (sessionId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_sessions_tracker')
        .update({ is_revoked: true })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await auditLog.record('SESSION_REVOKED', user.id, { revoked_session_id: sessionId });
      
      // If revoking current session, logout
      const { data: { session } } = await supabase.auth.getSession();
      const currentSessionId = session ? decodeJwtSessionId(session.access_token) : null;
      if (currentSessionId === sessionId) {
        await supabase.auth.signOut();
      }
      
      return { success: true };
    } catch (error) {
      throw formatError(error, 'Failed to revoke session', 'SESSION_REVOKE_ERROR');
    }
  },

  revokeAllOtherSessions: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      const currentSessionId = session ? decodeJwtSessionId(session.access_token) : null;

      const { error } = await supabase
        .from('user_sessions_tracker')
        .update({ is_revoked: true })
        .eq('user_id', user.id)
        .neq('session_id', currentSessionId);

      if (error) throw error;

      await auditLog.record('ALL_OTHER_SESSIONS_REVOKED', user.id);

      return { success: true };
    } catch (error) {
      throw formatError(error, 'Failed to revoke other sessions', 'SESSION_REVOKE_ERROR');
    }
  }
};
