import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { orgService } from '../../lib/orgService';
import { useOrg } from './OrgContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
  const logoUrl = watch('logo_url');
  const orgName = watch('name');
  const orgSlug = watch('slug');

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
      reset(data); // reset to clear isDirty
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeOrganization) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-lg mb-xl">
        <div className="space-y-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Organization Settings</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Update your workspace brand and fundamental core identity.</p>
        </div>
        {canEdit && (
          <div className="flex gap-md">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => reset()}
              disabled={!isDirty || loading}
            >
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              disabled={!isDirty || loading}
              isLoading={loading}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {error && <div className="p-3 text-sm text-error bg-error-container rounded-md">{error}</div>}
      {success && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">{t.successMessage}</div>}

      {/* Content Grid */}
      <div className="grid grid-cols-12 gap-lg">
        {/* Main Form Card */}
        <div className="col-span-12 max-w-4xl">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl shadow-sm">
            <h2 className="font-title-lg text-title-lg text-on-surface mb-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">business</span>
              Organization Profile
            </h2>
            
            <div className="space-y-xl">
              {/* Name Field */}
              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t.nameLabel}</label>
                <input 
                  type="text" 
                  {...register('name')} 
                  disabled={!canEdit} 
                  placeholder="e.g. VELTECH"
                  className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low" 
                />
                {errors.name && <p className="mt-1 text-xs text-error">{errors.name.message}</p>}
              </div>

              {/* Slug Field */}
              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t.slugLabel}</label>
                <div className="relative flex items-center">
                  <div className="absolute left-0 h-full px-md flex items-center bg-surface-container border-r border-outline-variant rounded-l-lg text-on-surface-variant font-label-md">
                    crewly.app/
                  </div>
                  <input 
                    type="text" 
                    {...register('slug')} 
                    disabled={!canEdit} 
                    className="w-full h-12 pl-[110px] pr-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low" 
                  />
                </div>
                {errors.slug && <p className="mt-1 text-xs text-error">{errors.slug.message}</p>}
              </div>

              {/* Logo Section */}
              <div className="space-y-sm pt-md">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Logo URL</label>
                
                {logoUrl && (
                  <div className="flex items-center gap-lg p-md border border-outline-variant rounded-lg bg-surface-container-low">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                      <OrgLogo logoUrl={logoUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md font-bold text-on-surface">Current Logo</span>
                      <span className="text-xs text-on-surface-variant">Round seal brandmark</span>
                    </div>
                    {canEdit && (
                      <button 
                        type="button"
                        onClick={() => setValue('logo_url', '', { shouldDirty: true })}
                        className="ml-auto text-error font-label-md hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}

                {canEdit && (
                  <div className="mt-md">
                    <FileUploader 
                      orgId={activeOrganization.id} 
                      featureName="logos" 
                      bucketName="public_assets"
                      accept="image/*"
                      onUploadComplete={(data) => {
                        setValue('logo_url', data.file_path, { shouldDirty: true });
                      }}
                    />
                    <input 
                      type="hidden" 
                      {...register('logo_url')} 
                    />
                  </div>
                )}
              </div>
              
              {/* Other Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-lg border-t border-outline-variant">
                <Input label={t.industryLabel} {...register('industry')} disabled={!canEdit} />
                <Input label={t.sizeLabel} {...register('size')} disabled={!canEdit} />
                <Input label={t.localeLabel} placeholder="e.g. en-US" {...register('locale')} disabled={!canEdit} />
                <Input label={t.timezoneLabel} placeholder="e.g. UTC" {...register('timezone')} disabled={!canEdit} />
                <div className="col-span-1 md:col-span-2 space-y-sm">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t.currencyLabel}</label>
                  <select 
                    {...register('currency')} 
                    disabled={!canEdit}
                    className="w-full h-12 px-md border border-outline-variant rounded-lg focus-ring font-body-md text-on-surface disabled:bg-surface-container-low"
                  >
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="GBP">GBP - British Pound (£)</option>
                    <option value="INR">INR - Indian Rupee (₹)</option>
                    <option value="AUD">AUD - Australian Dollar (A$)</option>
                    <option value="CAD">CAD - Canadian Dollar (C$)</option>
                    <option value="SGD">SGD - Singapore Dollar (S$)</option>
                    <option value="AED">AED - UAE Dirham</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
