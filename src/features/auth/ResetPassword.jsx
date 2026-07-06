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

const resetSchema = z.object({
  password: z.string()
    .min(authConfig.passwordPolicy.minLength, `Password must be at least ${authConfig.passwordPolicy.minLength} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

export const ResetPassword = () => {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);
  const navigate = useNavigate();
  const t = en.auth.resetPassword;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resetSchema)
  });

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      await authService.resetPassword(data.password);
      setSuccess(true);
    } catch (error) {
      setServerError(error.message);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Success">
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
          label={t.passwordLabel}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {t.submitButton}
        </Button>
      </form>
    </AuthLayout>
  );
};
