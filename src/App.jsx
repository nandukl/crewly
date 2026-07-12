import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

import { MainApp } from './MainApp';
import { TenantApp } from './features/tenant/TenantApp';

export const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const validateSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSession(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_sessions_tracker')
        .select('session_id')
        .eq('is_revoked', false)
        .limit(1);

      if (error || !data || data.length === 0) {
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(session);
      }
      setLoading(false);
    };

    validateSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!session) return <Navigate to="/login" />;
  
  return children;
};

function App() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  let tenantSlug = null;
  
  // Subdomain detection
  if (hostname.endsWith('.localhost')) {
    let sub = hostname.replace('.localhost', '');
    if (sub.startsWith('www.')) {
      sub = sub.substring(4);
    }
    if (sub.length > 0) {
      tenantSlug = sub;
    }
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Main domain locally, no tenant
    tenantSlug = null;
  } else {
    // Production domain detection (e.g., acme.crewly.com)
    if (hostname.endsWith('.crewly.com')) {
      let sub = hostname.replace('.crewly.com', '');
      if (sub.startsWith('www.')) {
        sub = sub.substring(4);
      }
      if (sub.length > 0) {
        tenantSlug = sub;
      }
    }
  }

  // Path-based fallback for local dev if subdomains are tricky (e.g. /t/acme-corp)
  const path = window.location.pathname;
  if (path.startsWith('/t/')) {
    const slug = path.split('/')[2];
    if (slug) {
      tenantSlug = slug;
    }
  }

  if (tenantSlug) {
    return <TenantApp slug={tenantSlug} />;
  }

  return <MainApp />;
}

export default App;
