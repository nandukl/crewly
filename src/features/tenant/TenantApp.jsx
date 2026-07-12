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
      <div className="min-h-screen bg-[#14161A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8A23C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !org) {
    const crewlyUrl = window.location.hostname.endsWith('localhost') ? 'http://localhost:5173' : 'https://crewly.com';
    return (
      <div className="min-h-screen bg-[#14161A] flex flex-col items-center justify-center font-body-md p-6">
        <div className="w-full max-w-[420px] bg-[#FFFFFF] border border-[#D8DAD5] rounded-sm p-8 text-center shadow-2xl text-[#1C2024]">
          <div className="flex justify-center mb-6">
            <span className="material-symbols-outlined text-[32px] text-[#C4453A]">domain_disabled</span>
          </div>
          <h1 className="font-display-md text-2xl text-[#1C2024] mb-3 font-bold">We couldn't find this workspace</h1>
          <p className="text-[#5B5F63] font-body-md text-sm mb-8 leading-relaxed">
            The workspace <span className="font-mono text-[#1C2024] bg-[#F7F7F4] px-1 py-0.5 rounded-sm">'{slug}'</span> does not exist or is inactive.
          </p>
          <a 
            href={crewlyUrl}
            className="inline-flex justify-center w-full py-3.5 bg-[#F7F7F4] border border-[#D8DAD5] hover:bg-white text-[#1C2024] font-medium rounded-sm transition-colors text-base"
          >
            Return to Crewly
          </a>
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
