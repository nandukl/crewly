import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../lib/authService';

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
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#14161A] flex flex-col items-center justify-center font-body-md p-6 selection:bg-[#E8A23C]/30">
      <div className="w-full max-w-[420px] flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* Branding (Above Form, larger) */}
        <div className="flex flex-col items-center mb-10 text-center">
          {organization.logo_url ? (
            <img 
              src={organization.logo_url} 
              alt={organization.name} 
              className="h-20 w-20 rounded-sm mb-6 object-cover border border-[#2A2C30]" 
            />
          ) : (
            <div className="h-20 w-20 rounded-sm mb-6 bg-white border border-[#D8DAD5] flex items-center justify-center text-3xl font-display-md text-[#1C2024]">
              {organization.name.substring(0,2).toUpperCase()}
            </div>
          )}
          <h1 className="font-display-lg text-4xl text-white tracking-tight">
            {organization.name}
          </h1>
        </div>

        {/* Form Panel - Strictly White for Contrast */}
        <div className="w-full bg-[#FFFFFF] border border-[#D8DAD5] rounded-sm p-8 shadow-2xl text-[#1C2024]">
          <h2 className="font-display-md text-2xl text-[#1C2024] mb-8 text-center">Sign in to {organization.name}</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-[#C4453A]/10 border border-[#C4453A]/30 text-[#C4453A] p-4 rounded-sm text-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#1C2024] mb-2">Work email</label>
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D8DAD5] rounded-sm px-4 py-3 text-[#1C2024] focus:border-[#E8A23C] focus:ring-1 focus:ring-[#E8A23C] outline-none transition-colors text-sm"
                placeholder="name@company.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#1C2024] mb-2">Password</label>
              <input 
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D8DAD5] rounded-sm px-4 py-3 text-[#1C2024] focus:border-[#E8A23C] focus:ring-1 focus:ring-[#E8A23C] outline-none transition-colors text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#E8A23C] hover:bg-[#d69536] text-[#7A4F14] font-medium py-3.5 rounded-sm transition-colors flex justify-center items-center disabled:opacity-50 text-base shadow-sm"
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>

        {/* Powered by */}
        <div className="mt-8 text-white/50 text-xs flex items-center gap-1.5 font-medium">
          <span>Powered by</span>
          <span className="text-white">Crewly</span>
        </div>

      </div>
    </div>
  );
};
