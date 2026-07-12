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
  industry: z.string().optional(),
  size: z.string().optional(),
  locale: z.string().optional(),
  currency: z.string().optional(),
});

export const CreateOrg = () => {
  const { register, handleSubmit, watch, setValue, formState: { errors, dirtyFields } } = useForm({
    resolver: zodResolver(schema),
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const { refreshOrganizations, switchOrganization } = useOrg();
  const navigate = useNavigate();
  const t = en.org.create;

  const nameValue = watch('name');
  const slugValue = watch('slug');

  useEffect(() => {
    if (!dirtyFields.slug && nameValue) {
      setValue('slug', nameValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''), { shouldValidate: true });
    }
  }, [nameValue, dirtyFields.slug, setValue]);

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
        slug: data.slug,
        industry: data.industry,
        size: data.size,
        locale: data.locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: data.currency
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg mx-auto">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">{t.title}</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {t.subtitle}
        </p>
      </div>

      <div className="mt-8 w-full max-w-lg mx-auto">
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
                Workspace URL
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  id="slug"
                  type="text"
                  {...register('slug')}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-slate-300 focus:ring-primary focus:border-primary sm:text-sm"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                  .crewly.com
                </span>
              </div>
              {slugValue && (
                <p className="mt-2 text-xs text-indigo-600 font-medium">
                  Your workspace will be at <strong>{slugValue}.crewly.com</strong>
                </p>
              )}
              {errors.slug && <p className="mt-2 text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Industry</label>
                <select {...register('industry')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white">
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Retail">Retail</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Company Size</label>
                <select {...register('size')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white">
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Locale</label>
                <select {...register('locale')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white">
                  <option value="">Select Locale</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-IN">English (India)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Default Currency</label>
                <select {...register('currency')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white">
                  <option value="">Select Currency</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full flex justify-center py-2 px-4" disabled={loading}>
                {loading ? 'Creating workspace...' : 'Create workspace'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
