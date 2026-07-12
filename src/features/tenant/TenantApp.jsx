import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ProtectedRoute } from '../../App';
import { OrgProvider, useOrg } from '../org/OrgContext';
import { OrgDashboard } from '../org/OrgDashboard';
import { TenantLogin } from './TenantLogin';
import { OnboardingWizard } from './OnboardingWizard';

const DashboardInterceptor = () => {
  const { activeOrganization } = useOrg();
  if (activeOrganization && activeOrganization.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />;
  }
  return <OrgDashboard />;
};

const OnboardingInterceptor = () => {
  const { activeOrganization } = useOrg();
  if (activeOrganization && activeOrganization.onboarding_completed === true) {
    return <Navigate to="/dashboard" replace />;
  }
  return <OnboardingWizard />;
};

export const TenantApp = ({ slug }) => {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_public_org_by_slug', { p_slug: slug })
          .single();

        if (error || !data) {
          setError('Organization not found');
        } else {
          setOrg(data);
        }
      } catch (err) {
        setError('Failed to load organization');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenant();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-body-md">
        <div className="text-center p-xl bg-surface-container-low rounded-2xl shadow-sm border border-outline-variant max-w-md">
          <span className="material-symbols-outlined text-[64px] text-error mb-4">domain_disabled</span>
          <h1 className="font-headline-sm text-on-surface">Workspace Not Found</h1>
          <p className="text-on-surface-variant mt-2">The workspace <strong>'{slug}'</strong> does not exist or has been disabled.</p>
          <a href="/" className="inline-block mt-8 text-primary font-bold hover:underline">Return to Crewly</a>
        </div>
      </div>
    );
  }

  // Define the base name if we are using the fallback path routing
  const basename = window.location.pathname.startsWith('/t/') ? `/t/${slug}` : '/';

  return (
    <Router basename={basename}>
      <Routes>
        <Route path="/login" element={<TenantLogin organization={org} />} />
        
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OrgProvider forcedOrgId={org.id}>
              <OnboardingInterceptor />
            </OrgProvider>
          </ProtectedRoute>
        } />
        
        {/* Enforce that the user is logged in, and then load the OrgContext to enforce membership */}
        <Route path="/dashboard/*" element={
          <ProtectedRoute>
            <OrgProvider forcedOrgId={org.id}>
              <DashboardInterceptor />
            </OrgProvider>
          </ProtectedRoute>
        } />
        
        {/* Redirect root of tenant domain to dashboard (which redirects to login if not authenticated) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};
