import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../../lib/authService';
import { supabase } from '../../../lib/supabaseClient';

// Mock dependencies
vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('Auth Service Validation & Logic', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Lockout Threshold Logic (Login)', () => {
    it('should reject login if account is locked out via RPC pre-check', async () => {
      // Mock check_lockout to return true
      supabase.rpc.mockResolvedValueOnce({ data: true, error: null });

      await expect(authService.login('test@example.com', 'Password123!'))
        .rejects.toThrow('Account is temporarily locked due to too many failed attempts.');
      
      expect(supabase.rpc).toHaveBeenCalledWith('check_lockout', { p_email: 'test@example.com' });
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should call record_failed_login RPC on login failure', async () => {
      // Mock not locked
      supabase.rpc.mockResolvedValueOnce({ data: false, error: null });
      // Mock login failure
      supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: new Error('Invalid credentials') });
      // Mock record_failed_login and auditLog.record (via rpc)
      supabase.rpc.mockResolvedValue({ error: null });
      
      try {
        await authService.login('test@example.com', 'WrongPass123!');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toBe('Invalid credentials');
        expect(e.error_code).toBe('LOGIN_ERROR');
      }

      expect(supabase.rpc).toHaveBeenCalledWith('record_failed_login', { 
        p_email: 'test@example.com', 
        p_max_attempts: 5, 
        p_lockout_minutes: 15 
      });
    });
  });

  describe('Anti-Enumeration Behavior (Forgot Password)', () => {
    it('should always return success message even if Supabase throws an error', async () => {
      supabase.auth.resetPasswordForEmail.mockRejectedValueOnce(new Error('User not found'));
      
      const res = await authService.forgotPassword('nonexistent@example.com');
      
      expect(res.success).toBe(true);
      expect(res.message).toBe('If an account exists for this email, a reset link has been sent.');
    });

    it('should return same success message on success', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
      
      const res = await authService.forgotPassword('exists@example.com');
      
      expect(res.success).toBe(true);
      expect(res.message).toBe('If an account exists for this email, a reset link has been sent.');
    });
  });

});
