import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingService } from '../lib/billingService';
import { supabase } from '../lib/supabaseClient';
import { auditLog } from '../lib/auditLog';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('../lib/auditLog', () => ({
  auditLog: {
    record: vi.fn(),
  },
}));

describe('billingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscriptionStatus', () => {
    it('returns subscription data on success', async () => {
      const mockData = { status: 'active' };
      const singleMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const eqMock = vi.fn().mockReturnValue({ single: singleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      supabase.from.mockReturnValue({ select: selectMock });

      const result = await billingService.getSubscriptionStatus('org-1');
      
      expect(result.data).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(selectMock).toHaveBeenCalledWith('status, trial_started_at, trial_ends_at, grace_ends_at');
      expect(eqMock).toHaveBeenCalledWith('organization_id', 'org-1');
    });

    it('returns NOT_FOUND error if record is missing', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      const eqMock = vi.fn().mockReturnValue({ single: singleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      supabase.from.mockReturnValue({ select: selectMock });

      const result = await billingService.getSubscriptionStatus('org-1');
      
      expect(result.error_code).toBe('NOT_FOUND');
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('updates status and logs to audit if authenticated', async () => {
      const mockUser = { id: 'admin-1' };
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockData = { status: 'locked' };
      const singleMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      supabase.from.mockReturnValue({ update: updateMock });

      const result = await billingService.updateSubscriptionStatus('org-1', 'locked');

      expect(result.data).toEqual(mockData);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'locked', updated_by: 'admin-1' }));
      expect(auditLog.record).toHaveBeenCalledWith(
        'SUBSCRIPTION_STATUS_CHANGED',
        'admin-1',
        expect.objectContaining({ new_status: 'locked' })
      );
    });

    it('returns UNAUTHORIZED if not logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: null, error: new Error('Auth error') });

      const result = await billingService.updateSubscriptionStatus('org-1', 'locked');

      expect(result.error_code).toBe('UNAUTHORIZED');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
