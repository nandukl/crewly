import React from 'react';
import { useOrg } from '../OrgContext';

export const OrgSwitcher = () => {
  const { organizations, activeOrganization, switchOrganization, isTenant } = useOrg();

  if (!organizations || organizations.length <= 1) return null;

  const handleSwitch = (e) => {
    const orgId = e.target.value;
    const targetOrg = organizations.find(o => o.id === orgId);
    if (!targetOrg) return;

    if (isTenant) {
      // If we are already on a tenant domain, redirect to the new tenant's domain
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost');
      const newHost = isLocal ? `${targetOrg.slug}.localhost:5173` : `${targetOrg.slug}.crewly.com`;
      const protocol = window.location.protocol;
      window.location.href = `${protocol}//${newHost}/dashboard`;
    } else {
      // If we are on the main domain (crewly.com), we can just switch state
      switchOrganization(orgId);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2 bg-surface-container border border-outline-variant px-3 py-1.5 rounded-sm">
        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">corporate_fare</span>
        <select
          value={activeOrganization?.id || ''}
          onChange={handleSwitch}
          className="bg-transparent border-none text-xs font-label-md uppercase tracking-widest text-on-surface focus:outline-none focus:ring-0 appearance-none cursor-pointer pr-4"
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id} className="bg-surface-container text-on-surface">
              {org.name}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined text-[14px] text-on-surface-variant pointer-events-none absolute right-3">expand_more</span>
      </div>
    </div>
  );
};
