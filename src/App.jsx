import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

import { Signup } from './features/auth/Signup';
import { Login } from './features/auth/Login';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { ResetPassword } from './features/auth/ResetPassword';
import { MFAEnroll } from './features/auth/MFAEnroll';
import { MFAChallenge } from './features/auth/MFAChallenge';
import { Sessions } from './features/auth/Sessions';
import { OrgProvider } from './features/org/OrgContext';
import { OrgDashboard } from './features/org/OrgDashboard';
import { CreateOrg } from './features/org/CreateOrg';
import { AcceptInvite } from './features/org/AcceptInvite';
import { AdminRoute } from './features/admin/AdminRoute';
import { PlatformAdminDashboard } from './features/admin/PlatformAdminDashboard';

const ProtectedRoute = ({ children }) => {
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

      // Check if session is revoked in the database
      const { data, error } = await supabase
        .from('user_sessions_tracker')
        .select('session_id')
        .eq('is_revoked', false)
        .limit(1);

      // If RLS returns no rows for this session, it means it was revoked remotely
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
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/mfa/enroll" element={<ProtectedRoute><MFAEnroll /></ProtectedRoute>} />
        <Route path="/mfa/challenge" element={<ProtectedRoute><MFAChallenge /></ProtectedRoute>} />
        
        <Route path="/dashboard" element={<ProtectedRoute><OrgProvider><OrgDashboard /></OrgProvider></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OrgProvider><CreateOrg /></OrgProvider></ProtectedRoute>} />
        <Route path="/invite/accept" element={<ProtectedRoute><OrgProvider><AcceptInvite /></OrgProvider></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminRoute><PlatformAdminDashboard /></AdminRoute></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
