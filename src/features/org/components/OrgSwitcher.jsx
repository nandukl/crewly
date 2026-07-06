import React from 'react';
import { useOrg } from '../OrgContext';

export const OrgSwitcher = () => {
  const { organizations, activeOrganization, switchOrganization } = useOrg();

  if (!organizations || organizations.length <= 1) return null;

  return (
    <div className="relative inline-block text-left">
      <select
        value={activeOrganization?.id || ''}
        onChange={(e) => switchOrganization(e.target.value)}
        className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
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
