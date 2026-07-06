import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { orgService } from '../../lib/orgService';
import { useOrg } from './OrgContext';
import { Button } from '../../components/ui/Button';
import { FileUploader } from '../storage/FileUploader';
import { OrgLogo } from './OrgLogo';
import en from '../../locales/en.json';

const schema = z.object({
  name: z.string().min(1, 'Organization Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  logo_url: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
  locale: z.string().optional().or(z.literal('')),
  timezone: z.string().optional().or(z.literal('')),
  currency: z.string().optional().or(z.literal('')),
});

export const OrgProfile = () => {
  const { activeOrganization, currentMembership, refreshOrganizations } = useOrg();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = en.org.profile;

  useEffect(() => {
    if (activeOrganization) {
      reset({
        name: activeOrganization.name || '',
        slug: activeOrganization.slug || '',
        logo_url: activeOrganization.logo_url || '',
        industry: activeOrganization.industry || '',
        size: activeOrganization.size || '',
        locale: activeOrganization.locale || '',
        timezone: activeOrganization.timezone || '',
        currency: activeOrganization.currency || '',
      });
    }
  }, [activeOrganization, reset]);

  const canEdit = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';

  const onSubmit = async (data) => {
    if (!canEdit) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      await orgService.updateOrganization(activeOrganization.id, data);
      await refreshOrganizations();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeOrganization) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-slate-900">{t.title}</h3>
          
          {error && <div className="mt-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
          {success && <div className="mt-4 p-3 text-sm text-green-700 bg-green-100 rounded-md">{t.successMessage}</div>}

          <form className="mt-5 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">{t.nameLabel}</label>
                <div className="mt-1">
                  <input type="text" {...register('name')} disabled={!canEdit} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-50" />
                  {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="slug" className="block text-sm font-medium text-slate-700">{t.slugLabel}</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                    crewly.app/
                  </span>
                  <input type="text" {...register('slug')} disabled={!canEdit} className="flex-1 block w-full border-slate-300 rounded-none rounded-r-md focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-50" />
                </div>
                {errors.slug && <p className="mt-2 text-sm text-red-600">{errors.slug.message}</p>}
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t.logoUrlLabel}</label>
                
                {watch('logo_url') && (
                  <div className="mb-4 flex items-center gap-4">
                    <OrgLogo logoUrl={watch('logo_url')} className="h-24 w-24 object-cover rounded-full shadow-sm" />
                    <span className="text-sm text-slate-500 font-medium">Current Logo</span>
                  </div>
                )}

                {canEdit ? (
                  <FileUploader 
                    orgId={activeOrganization.id} 
                    featureName="logos" 
                    accept="image/*"
                    onUploadComplete={(data) => {
                      setValue('logo_url', data.file_path, { shouldDirty: true });
                    }}
                  />
                ) : null}
                <div className="mt-2">
                  <input type="text" {...register('logo_url')} readOnly className="block w-full border-slate-300 rounded-md shadow-sm bg-slate-50 text-slate-500 sm:text-sm" placeholder="Upload a logo to generate path..." />
                  {errors.logo_url && <p className="mt-2 text-sm text-red-600">{errors.logo_url.message}</p>}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="industry" className="block text-sm font-medium text-slate-700">{t.industryLabel}</label>
                <div className="mt-1">
                  <input type="text" {...register('industry')} disabled={!canEdit} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-50" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="size" className="block text-sm font-medium text-slate-700">{t.sizeLabel}</label>
                <div className="mt-1">
                  <input type="text" {...register('size')} disabled={!canEdit} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-50" />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="locale" className="block text-sm font-medium text-slate-700">{t.localeLabel}</label>
                <div className="mt-1">
                  <input type="text" {...register('locale')} disabled={!canEdit} placeholder="e.g. en-US" className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-50" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">{t.timezoneLabel}</label>
                <div className="mt-1">
                  <input type="text" {...register('timezone')} disabled={!canEdit} placeholder="e.g. UTC" className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-50" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="currency" className="block text-sm font-medium text-slate-700">{t.currencyLabel}</label>
                <div className="mt-1">
                  <input type="text" {...register('currency')} disabled={!canEdit} placeholder="e.g. USD" className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-50" />
                </div>
              </div>
            </div>
            
            {canEdit && (
              <div className="pt-5">
                <div className="flex justify-end">
                  <Button type="submit" disabled={!isDirty || loading}>
                    {loading ? 'Saving...' : t.saveButton}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
