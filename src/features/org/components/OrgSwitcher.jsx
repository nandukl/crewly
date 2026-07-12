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
      <select
        value={activeOrganization?.id || ''}
        onChange={handleSwitch}
        className="block w-full pl-3 pr-8 py-1.5 text-sm font-medium bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-md"
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
};
