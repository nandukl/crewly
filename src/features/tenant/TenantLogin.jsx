import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export const TenantLogin = ({ organization }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // The user is logged in. 
      // The OrgContext (loaded in /dashboard) will enforce that they actually belong to this organization.
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex font-body-md">
      {/* Left side: Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-12 bg-surface-container-lowest border-r border-outline-variant relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="max-w-md relative z-10">
          {organization.logo_url ? (
            <img src={organization.logo_url} alt={organization.name} className="h-16 w-16 object-cover rounded-xl shadow-sm mb-6 bg-white" />
          ) : (
            <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center mb-6 shadow-sm">
              <span className="font-headline-md font-bold">{organization.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="font-headline-lg text-4xl font-bold text-on-surface mb-4">
            Welcome to {organization.name}
          </h1>
          <p className="text-on-surface-variant text-lg">
            Sign in to access your employee workspace.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 bg-surface relative">
        <div className="w-full max-w-[400px] mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            {organization.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="h-10 w-10 object-cover rounded-lg shadow-sm" />
            ) : (
              <div className="w-10 h-10 bg-primary-container text-on-primary-container rounded-lg flex items-center justify-center shadow-sm">
                <span className="font-title-md font-bold">{organization.name.charAt(0)}</span>
              </div>
            )}
            <span className="font-headline-sm font-bold text-on-surface">{organization.name}</span>
          </div>

          <h2 className="font-headline-md text-2xl font-bold text-on-surface mb-2">Sign In</h2>
          <p className="text-on-surface-variant mb-8">Enter your credentials to access your account.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm border border-error/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">Work Email</label>
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                placeholder="name@company.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-on-surface">Password</label>
                <a href="#" className="text-sm font-bold text-primary hover:underline">Forgot password?</a>
              </div>
              <input 
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-3 rounded-lg transition-colors flex justify-center items-center h-12 shadow-sm"
            >
              {loading ? <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span> : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-outline-variant flex justify-center items-center gap-2 text-sm text-on-surface-variant opacity-70">
            <span>Powered by</span>
            <span className="font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
              Crewly
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
