import React, { createContext, useContext, useState, useEffect } from 'react';
import { orgService } from '../../lib/orgService';
import { supabase } from '../../lib/supabaseClient';

const OrgContext = createContext(null);

export const OrgProvider = ({ children }) => {
  const [organizations, setOrganizations] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        setCurrentUser(user);

        const orgs = await orgService.getOrganizations();
        setOrganizations(orgs);

        // Fetch last active org id from user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('last_active_org_id')
          .eq('id', user.id)
          .single();

        if (profile?.last_active_org_id && orgs.some(o => o.id === profile.last_active_org_id)) {
          setActiveOrgId(profile.last_active_org_id);
        } else if (orgs.length > 0) {
          setActiveOrgId(orgs[0].id);
        }
      } catch (err) {
        console.error('Failed to load organizations', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, []);

  const switchOrganization = async (orgId) => {
    setActiveOrgId(orgId);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ last_active_org_id: orgId })
        .eq('id', user.id);
    }
  };

  const activeOrganization = organizations.find(o => o.id === activeOrgId);
  const currentMembership = activeOrganization?.memberships?.find(
    m => m.status === 'active' && m.user_id === currentUser?.id
  );

  return (
    <OrgContext.Provider value={{
      organizations,
      activeOrganization,
      currentMembership,
      switchOrganization,
      loading,
      refreshOrganizations: async () => {
         const orgs = await orgService.getOrganizations();
         setOrganizations(orgs);
      }
    }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => useContext(OrgContext);
