import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './features/public/LandingPage';
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
import { ProtectedRoute } from './App';

export const MainApp = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/mfa/enroll" element={<ProtectedRoute><MFAEnroll /></ProtectedRoute>} />
        <Route path="/mfa/challenge" element={<ProtectedRoute><MFAChallenge /></ProtectedRoute>} />
        
        {/* Admin Workspace Access on main domain (or should they be forced to subdomain? For now, keep it for admins) */}
        <Route path="/dashboard" element={<ProtectedRoute><OrgProvider><OrgDashboard /></OrgProvider></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OrgProvider><CreateOrg /></OrgProvider></ProtectedRoute>} />
        <Route path="/invite/accept" element={<ProtectedRoute><OrgProvider><AcceptInvite /></OrgProvider></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminRoute><PlatformAdminDashboard /></AdminRoute></ProtectedRoute>} />
      </Routes>
    </Router>
  );
};
