import passwordRules from '../../supabase/functions/shared/password-rules.json';

export const authConfig = {
  passwordPolicy: passwordRules,
  lockout: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
  },
  tokens: {
    resetExpiryHours: 1,
    verificationExpiryHours: 1,
  }
};
