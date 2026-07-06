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

      // Check the user_profiles table for the super admin flag
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_super_admin')
        .single();
        
      if (!error && data?.is_super_admin) {
        setIsSuperAdmin(true);
      }
      setLoading(false);
    };

    checkAdminStatus();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Verifying access...</div>;
  if (!isSuperAdmin) return <Navigate to="/dashboard" />;
  
  return children;
};
