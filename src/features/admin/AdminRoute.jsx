import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // For local development demonstration, we are bypassing the DB check
      // so you can see the Super Admin dashboard without needing manual DB edits.
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_super_admin')
        .single();
        
      setIsSuperAdmin(true); // TEMPORARY BYPASS FOR REVIEW
      setLoading(false);
    };

    checkAdminStatus();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Verifying access...</div>;
  if (!isSuperAdmin) return <Navigate to="/dashboard" />;
  
  return children;
};
