import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orgService } from '../../../lib/orgService';
import { supabase } from '../../../lib/supabaseClient';

vi.mock('../../../lib/supabaseClient', () => {
  const insertMock = vi.fn().mockReturnThis();
  const selectMock = vi.fn().mockReturnThis();
  const updateMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();
  const singleMock = vi.fn();
  const maybeSingleMock = vi.fn();

  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        insert: insertMock,
        select: selectMock,
        update: updateMock,
        eq: eqMock,
        neq: vi.fn().mockReturnThis(),
        single: singleMock,
        maybeSingle: maybeSingleMock,
      })),
      rpc: vi.fn()
    }
  };
});

describe('orgService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrganization (Slug collision)', () => {
    it('should throw an error if slug is already in use', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } } });
      
      const chain = supabase.from();
      chain.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing-org-id' } }); // slug exists

      await expect(orgService.createOrganization('My Org', 'my-org'))
        .rejects.toThrow('Slug is already in use. Please choose another.');
    });
  });

  describe('transferOwnership (Exactly One Owner)', () => {
    it('should call transfer_org_ownership RPC', async () => {
      supabase.rpc.mockResolvedValueOnce({ error: null });
      
      const chain = supabase.from();
      chain.single.mockResolvedValueOnce({ data: { email: 'new-owner@test.com' } });

      await orgService.transferOwnership('org-id', 'mem-id');
      
      expect(supabase.rpc).toHaveBeenCalledWith('transfer_org_ownership', {
        p_org_id: 'org-id',
        p_new_owner_membership_id: 'mem-id'
      });
    });
  });

  describe('archiveStructureNode (Dependent Nodes)', () => {
    it('should throw error if node has active children', async () => {
      const chain = supabase.from();
      // Mock children check: returns an array with 1 item
      chain.eq.mockReturnThis();
      // since it doesn't call single/maybeSingle here but awaits the chain directly for an array:
      // We'll mock the whole chain return
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn(resolve => resolve({ data: [{ id: 'child-1' }], error: null }))
      });

      await expect(orgService.archiveStructureNode('parent-id'))
        .rejects.toThrow('Cannot archive a node that has active child nodes.');
    });
  });
});
