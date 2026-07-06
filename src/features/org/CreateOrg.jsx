import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { orgService } from '../../lib/orgService';
import { useOrg } from './OrgContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import en from '../../locales/en.json';

const schema = z.object({
  name: z.string().min(1, 'Organization Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

export const CreateOrg = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const { refreshOrganizations, switchOrganization } = useOrg();
  const navigate = useNavigate();
  const t = en.org.create;

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
      const newOrg = await orgService.createOrganization(data.name, data.slug);
      await refreshOrganizations();
      await switchOrganization(newOrg.id);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">{t.title}</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {t.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {pendingInvites.length > 0 && (
          <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-10 mb-6 border-2 border-blue-500">
            <h3 className="text-lg font-medium text-slate-900 mb-4">You have pending invitations</h3>
            <div className="space-y-4">
              {pendingInvites.map(invite => (
                <div key={invite.organization_id} className="flex items-center justify-between p-4 bg-slate-50 rounded border">
                  <div>
                    <p className="font-semibold text-slate-900">{invite.organizations?.name}</p>
                    <p className="text-sm text-slate-500 capitalize">Role: {invite.role.replace('_', ' ')}</p>
                  </div>
                  <Button onClick={() => handleAcceptInvite(invite.organization_id)} disabled={loading}>
                    Join
                  </Button>
                </div>
              ))}
            </div>
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or create your own</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                {t.nameLabel}
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
                {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-slate-700">
                {t.slugLabel}
              </label>
              <p className="text-xs text-slate-500 mb-1">{t.slugHelp}</p>
              <div className="mt-1">
                <input
                  id="slug"
                  type="text"
                  {...register('slug')}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
                {errors.slug && <p className="mt-2 text-sm text-red-600">{errors.slug.message}</p>}
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full flex justify-center py-2 px-4" disabled={loading}>
                {loading ? 'Creating...' : t.submitButton}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
