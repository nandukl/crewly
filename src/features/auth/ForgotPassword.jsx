import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../lib/authService';
import en from '../../locales/en.json';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const ForgotPassword = () => {
  const [successMessage, setSuccessMessage] = useState(null);
  const [serverError, setServerError] = useState(null);
  const t = en.auth.forgotPassword;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      const res = await authService.forgotPassword(data.email);
      setSuccessMessage(res.message);
    } catch (error) {
      // Even errors are obscured to prevent enumeration
      setSuccessMessage(t.successMessage);
    }
  };

  if (successMessage) {
    return (
      <AuthLayout title={t.title}>
        <div className="text-center">
          <p className="text-slate-600 mb-6">{successMessage}</p>
          <Link to="/login">
            <Button className="w-full">{t.backToLogin}</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.title} subtitle={t.description}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
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

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {t.submitButton}
        </Button>

        <div className="text-center mt-4 text-sm">
          <Link to="/login" className="text-primary hover:text-primary-dark font-medium">
            {t.backToLogin}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
