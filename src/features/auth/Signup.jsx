import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Input } from '../../components/ui/Input';
import { authService } from '../../lib/authService';
import { orgService } from '../../lib/orgService';
import { authConfig } from '../../config/auth.config';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(authConfig.passwordPolicy.minLength, `Password must be at least ${authConfig.passwordPolicy.minLength} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

export const Signup = () => {
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Workspace step state
  const [orgName, setOrgName] = useState('');
  
  // Keep email/password for auto-login hack in step 2
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signupSchema)
  });

  const onAccountSubmit = async (data) => {
    try {
      setServerError(null);
      await authService.signup(data.email, data.password, data.fullName);
      setCredentials({ email: data.email, password: data.password });
      setStep(2);
    } catch (error) {
      setServerError(error.message);
    }
  };

  const handleDevVerify = async () => {
    try {
      setServerError(null);
      setLoading(true);
      await authService.login(credentials.email, credentials.password);
      setStep(3);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onWorkspaceSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    
    try {
      setServerError(null);
      setLoading(true);
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await orgService.createOrganization({ name: orgName, slug });
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <AuthLayout title="Check your email" step={2}>
        <div className="text-center space-y-6">
          <p className="text-[#5B5F63] font-body-md">
            We've sent a verification link to your email address. Please click it to verify your account.
          </p>
          
          {serverError && (
            <div className="p-3 text-sm text-[#C4453A] bg-[#C4453A]/10 border border-[#C4453A]/20 rounded-sm text-left">
              {serverError}
            </div>
          )}

          <div className="pt-4 border-t border-[#D8DAD5]">
            <p className="text-xs text-[#5B5F63] mb-4">Development only:</p>
            <button 
              onClick={handleDevVerify}
              disabled={loading}
              className="w-full bg-[#E8A23C] hover:bg-[#d69536] text-[#7A4F14] font-medium py-3 rounded-sm transition-colors text-base shadow-sm disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Simulate Verification & Continue'}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (step === 3) {
    const liveSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    return (
      <AuthLayout title="Name your workspace" subtitle="This is where your team will work." step={3}>
        <form onSubmit={onWorkspaceSubmit} className="space-y-6">
          {serverError && (
            <div className="p-3 text-sm text-[#C4453A] bg-[#C4453A]/10 border border-[#C4453A]/20 rounded-sm">
              {serverError}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-[#1C2024] mb-2">Organization name</label>
            <input 
              type="text"
              required
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#D8DAD5] rounded-sm px-4 py-3 text-[#1C2024] focus:border-[#E8A23C] focus:ring-1 focus:ring-[#E8A23C] outline-none transition-colors text-sm"
              placeholder="e.g. Acme Corp"
              autoFocus
            />
          </div>

          {/* The signature creative moment: live slug generation */}
          <div className="bg-[#F7F7F4] border border-[#D8DAD5] p-4 rounded-sm flex items-center overflow-hidden">
            <span className="font-mono text-[#2F9E8F] text-sm truncate">
              {liveSlug ? `${liveSlug}.crewly.com` : 'your-org-name.crewly.com'}
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading || !orgName.trim()}
            className="w-full mt-8 bg-[#E8A23C] hover:bg-[#d69536] text-[#7A4F14] font-medium py-3 rounded-sm transition-colors text-base shadow-sm disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create workspace'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  // Step 1: Account
  return (
    <AuthLayout title="Create your account" step={1}>
      <form onSubmit={handleSubmit(onAccountSubmit)} className="space-y-6">
        {serverError && (
          <div className="p-3 text-sm text-[#C4453A] bg-[#C4453A]/10 border border-[#C4453A]/20 rounded-sm">
            {serverError}
          </div>
        )}
        
        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full mt-8 bg-[#E8A23C] hover:bg-[#d69536] text-[#7A4F14] font-medium py-3 rounded-sm transition-colors text-base shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? 'Processing...' : 'Continue'}
        </button>

        <div className="text-center mt-6 text-sm">
          <Link to="/login" className="text-[#5B5F63] hover:text-[#1C2024] font-medium transition-colors">
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
