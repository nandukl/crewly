import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../lib/authService';
import en from '../../locales/en.json';

const schema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d+$/, 'Code must contain only numbers'),
});

export const MFAEnroll = () => {
  const [serverError, setServerError] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const t = en.auth.mfa;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    const enroll = async () => {
      try {
        const factor = await authService.enrollMfa();
        setFactorId(factor.id);
        setQrCode(factor.totp.qr_code);
      } catch (error) {
        setServerError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    enroll();
  }, []);

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      await authService.verifyMfaEnrollment(factorId, data.code);
      navigate('/dashboard');
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <AuthLayout title={t.enrollTitle} subtitle={t.enrollDescription}>
      {isLoading ? (
        <div className="flex justify-center p-8"><span className="animate-spin text-primary">Loading...</span></div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {serverError && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
              {serverError}
            </div>
          )}
          
          <div className="flex justify-center mb-6">
             <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 border rounded-md p-2 shadow-sm" />
          </div>

          <Input
            label={t.codeLabel}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            error={errors.code?.message}
            {...register('code')}
          />

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {t.verifyButton}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};
