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
import { authConfig } from '../../config/auth.config';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(authConfig.passwordPolicy.minLength, `Password must be at least ${authConfig.passwordPolicy.minLength} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

export const Signup = () => {
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const t = en.auth.signup;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      await authService.signup(data.email, data.password);
      setSuccess(true);
    } catch (error) {
      setServerError(error.message);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Check your email">
        <div className="text-center">
          <p className="text-slate-600 mb-6">{t.successMessage}</p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.title}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {serverError}
          </div>
        )}
        
        <Input
          label={t.emailLabel}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label={t.passwordLabel}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {t.submitButton}
        </Button>

        <div className="text-center mt-4 text-sm">
          <Link to="/login" className="text-primary hover:text-primary-dark font-medium">
            {t.alreadyHaveAccount}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
