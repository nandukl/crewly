import React, { createContext, useContext, useState, useEffect } from 'react';
import { orgService } from '../../lib/orgService';
import { supabase } from '../../lib/supabaseClient';

const OrgContext = createContext(null);

export const OrgProvider = ({ children, forcedOrgId = null }) => {
  const [organizations, setOrganizations] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeModules, setActiveModules] = useState([]);

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

        if (forcedOrgId) {
          // If we are on a tenant domain, strictly force this org ID
          const orgBelongs = orgs.find(o => o.id === forcedOrgId);
          if (orgBelongs) {
            setActiveOrgId(forcedOrgId);
          } else {
            // They don't belong to this tenant!
            // Actually, for security, if they don't belong, activeOrgId remains null
            // and the UI will reflect that they have no access.
            setActiveOrgId(null);
          }
        } else if (profile?.last_active_org_id && orgs.some(o => o.id === profile.last_active_org_id)) {
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

  const fetchActiveModules = async (orgId) => {
    if (!orgId) return;
    try {
      const { data } = await supabase
        .from('org_module_activations')
        .select('module_key')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      setActiveModules(data?.map(d => d.module_key) || []);
    } catch (err) {
      console.error('Failed to load modules', err);
    }
  };

  useEffect(() => {
    fetchActiveModules(activeOrgId);
  }, [activeOrgId]);

  const switchOrganization = async (orgId) => {
    if (forcedOrgId) return; // Cannot switch organizations on a tenant domain!
    
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
      activeModules,
      switchOrganization,
      loading,
      refreshModules: () => fetchActiveModules(activeOrgId),
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
