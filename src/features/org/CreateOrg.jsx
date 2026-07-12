import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { orgService } from '../../lib/orgService';
import { useOrg } from './OrgContext';
import { useNavigate } from 'react-router-dom';
import en from '../../locales/en.json';
import { AuthLayout } from '../auth/AuthLayout';
import { Input } from '../../components/ui/Input';

const schema = z.object({
  name: z.string().min(1, 'Organization Name is required')
});

export const CreateOrg = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const { refreshOrganizations, switchOrganization } = useOrg();
  const navigate = useNavigate();
  const t = en.org.create;

  const nameValue = watch('name') || '';
  
  // Live generate the slug character by character based on name
  const generatedSlug = nameValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const invites = await orgService.getPendingInvitations();
        setPendingInvites(invites || []);
      } catch (err) {
        console.error('Failed to fetch pending invitations:', err);
      } finally {
        setInvitesLoading(false);
      }
    };
    fetchInvites();
  }, []);

  const handleAcceptInvite = async (orgId) => {
    try {
      setLoading(true);
      setError(null);
      await orgService.acceptInvite(orgId);
      await refreshOrganizations();
      await switchOrganization(orgId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      const newOrg = await orgService.createOrganization({
        name: data.name,
        slug: generatedSlug,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      await refreshOrganizations();
      
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
         window.location.href = `http://${newOrg.slug}.localhost:${window.location.port}/dashboard`;
      } else {
         window.location.href = `https://${newOrg.slug}.crewly.com/dashboard`;
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t.title} subtitle={t.subtitle} step={3}>
      
      {pendingInvites.length > 0 && (
        <div className="mb-8 border border-[#2F9E8F] bg-[#2F9E8F]/10 rounded-md p-6">
          <h3 className="font-headline-md text-white mb-4">Pending Invitations</h3>
          <div className="space-y-4 mb-6">
            {pendingInvites.map(invite => (
              <div key={invite.organization_id} className="flex items-center justify-between p-4 bg-surface-container border border-outline-variant rounded-sm">
                <div>
                  <p className="font-label-md uppercase tracking-widest text-white">{invite.organizations?.name}</p>
                  <p className="text-xs text-[#2F9E8F] uppercase mt-1">Role: {invite.role.replace('_', ' ')}</p>
                </div>
                <button 
                  onClick={() => handleAcceptInvite(invite.organization_id)} 
                  disabled={loading}
                  className="bg-transparent border border-outline-variant hover:bg-surface text-white px-4 py-2 text-xs font-label-md uppercase tracking-widest rounded-sm transition-colors"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-surface text-xs font-label-md uppercase tracking-widest text-on-surface-variant">Or initialize your own</span>
            </div>
          </div>
        </div>
      )}

      <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="p-3 text-sm text-[#C4453A] bg-[#C4453A]/10 border border-[#C4453A]/20 rounded-sm">
            {error}
          </div>
        )}

        <Input
          label={t.nameLabel}
          type="text"
          autoComplete="organization"
          placeholder="e.g. Acme Corp"
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Live slug preview - The one creative moment */}
        <div className="mt-8 bg-surface-container border border-outline-variant rounded-sm p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#2F9E8F]/30 to-transparent"></div>
          <p className="text-[10px] font-label-md uppercase tracking-widest text-on-surface-variant mb-2">Workspace allocation</p>
          <div className="flex items-center text-sm sm:text-base md:text-lg">
            <span className="font-mono text-[#2F9E8F] break-all">{generatedSlug || 'your-org-name'}</span>
            <span className="font-mono text-on-surface-variant/50">.crewly.com</span>
            <span className="ml-1 w-2 h-4 bg-[#2F9E8F] animate-pulse"></span>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !generatedSlug}
          className="w-full mt-8 bg-[#E8A23C] hover:bg-[#d69536] text-primary-container font-label-md uppercase tracking-widest py-3 transition-colors rounded-sm disabled:opacity-50"
        >
          {loading ? 'Initializing...' : 'Create workspace'}
        </button>
      </form>
    </AuthLayout>
  );
};
