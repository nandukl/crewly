import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../lib/authService';
import en from '../../locales/en.json';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const Login = () => {
  const [serverError, setServerError] = useState(null);
  const navigate = useNavigate();
  const t = en.auth.login;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      await authService.login(data.email, data.password);
      
      const mfaStatus = await authService.checkMfaEnrollment();
      if (mfaStatus.isSuperAdmin) {
         navigate('/admin');
      } else {
         navigate('/dashboard');
      }
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <AuthLayout title="Welcome Back">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg">
        {serverError && (
          <div className="p-3 text-sm text-error bg-error-container rounded-md">
            {serverError}
          </div>
        )}
        
        <Input
          label={t.emailLabel}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          placeholder="name@company.com"
          {...register('email')}
        />

        <div className="space-y-1">
          <Input
            label={t.passwordLabel}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            placeholder="••••••••"
            {...register('password')}
          />
          <div className="flex justify-end pt-1">
            <Link to="/forgot-password" className="text-[13px] text-secondary hover:underline font-medium">
              {t.forgotPasswordLink}
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {t.submitButton}
          </Button>
        </div>

        <div className="text-center pt-xl">
          <p className="font-body-md text-on-surface-variant">
            {t.noAccountLink.split('?')[0]}?{' '}
            <Link to="/signup" className="text-secondary font-semibold hover:underline ml-xs">
              {t.noAccountLink.split('?')[1] || 'Sign up'}
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};
