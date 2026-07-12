import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rbacService } from '../lib/rbacService';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('rbacService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('can (has_permission)', () => {
    it('returns true when user has permission', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await rbacService.can('org-1', 'manage', 'payroll_runs');
      
      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('has_permission', {
        p_user_id: 'user-1',
        p_org_id: 'org-1',
        p_resource_type: 'payroll_runs',
        p_action: 'manage'
      });
    });

    it('returns false when user is denied permission (negative case)', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      supabase.rpc.mockResolvedValue({ data: false, error: null });

      const result = await rbacService.can('org-1', 'manage', 'payroll_runs');
      
      expect(result).toBe(false);
    });

    it('returns false if not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await rbacService.can('org-1', 'manage', 'payroll_runs');
      
      expect(result).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('fails closed and returns false on DB error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      supabase.rpc.mockResolvedValue({ data: null, error: new Error('DB Error') });

      const result = await rbacService.can('org-1', 'manage', 'payroll_runs');
      
      expect(result).toBe(false);
    });
  });
});
