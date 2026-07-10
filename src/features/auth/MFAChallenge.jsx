import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../lib/authService';
import { supabase } from '../../lib/supabaseClient';
import en from '../../locales/en.json';

const schema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d+$/, 'Code must contain only numbers'),
});

export const MFAChallenge = () => {
  const [serverError, setServerError] = useState(null);
  const [factorId, setFactorId] = useState('');
  const navigate = useNavigate();
  const t = en.auth.mfa;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    const fetchFactor = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        
        const factors = data?.all || [];
        const totpFactor = factors.find(f => f.factorType === 'totp' && f.status === 'verified');
        
        if (totpFactor) {
          setFactorId(totpFactor.id);
        } else {
          // If no verified factor is found, redirect to enrollment
          navigate('/mfa/enroll');
        }
      } catch (err) {
        setServerError(err.message || 'Failed to fetch MFA factors.');
      }
    };
    fetchFactor();
  }, [navigate]);

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      await authService.challengeMfa(factorId, data.code);
      navigate('/dashboard');
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <AuthLayout title={t.challengeTitle} subtitle={t.challengeDescription}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
        {serverError && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {serverError}
          </div>
        )}
        
        <Input
          label={t.codeLabel}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          error={errors.code?.message}
          {...register('code')}
          disabled={!factorId}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={!factorId}>
          {t.verifyButton}
        </Button>
      </form>
    </AuthLayout>
  );
};
