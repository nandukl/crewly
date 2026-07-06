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
      
      // Check MFA Status
      const mfaStatus = await authService.checkMfaEnrollment();
      if (mfaStatus.aal.nextLevel === 'aal2') {
         // User is enrolled in MFA but hasn't verified this session
         navigate('/mfa/challenge');
      } else if (mfaStatus.isSuperAdmin && !mfaStatus.isEnrolled) {
         // Super Admin mandatory MFA enrollment
         navigate('/mfa/enroll');
      } else {
         // Proceed to dashboard
         navigate('/dashboard');
      }
    } catch (error) {
      setServerError(error.message);
    }
  };

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

        <div>
          <Input
            label={t.passwordLabel}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end mt-1">
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-dark">
              {t.forgotPasswordLink}
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {t.submitButton}
        </Button>

        <div className="text-center mt-4 text-sm">
          <Link to="/signup" className="text-primary hover:text-primary-dark font-medium">
            {t.noAccountLink}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
