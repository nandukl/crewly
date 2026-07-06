import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import zxcvbn from "https://esm.sh/zxcvbn@4.4.2"
import passwordRules from "../shared/password-rules.json" with { type: "json" }

// Note: Supabase edge functions run on Deno.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function checkPwnedPassword(password: string): Promise<boolean> {
  // Generate SHA-1 hash of the password
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  
  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) return false; // If API fails, default to allowing rather than blocking
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith(suffix)) {
        return true; // Password found in breach list
      }
    }
  } catch (e) {
    console.error("PwnedPasswords API error", e);
  }
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Check complexity
    const passwordRequirements = {
      minLength: passwordRules.minLength,
      hasUpper: passwordRules.requireUppercase ? /[A-Z]/.test(password) : true,
      hasLower: passwordRules.requireLowercase ? /[a-z]/.test(password) : true,
      hasNumber: passwordRules.requireNumbers ? /[0-9]/.test(password) : true,
      hasSpecial: passwordRules.requireSpecial ? /[^A-Za-z0-9]/.test(password) : true
    };

    if (password.length < passwordRequirements.minLength || 
        !passwordRequirements.hasUpper || 
        !passwordRequirements.hasLower || 
        !passwordRequirements.hasNumber || 
        !passwordRequirements.hasSpecial) {
      return new Response(JSON.stringify({ error: "Password does not meet complexity requirements." }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const zxcvbnResult = zxcvbn(password);
    if (zxcvbnResult.score < 3) {
      return new Response(JSON.stringify({ error: "Password is too weak. Please choose a stronger password." }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Check Pwned Passwords API
    const isPwned = await checkPwnedPassword(password);
    if (isPwned) {
      return new Response(JSON.stringify({ error: "This password has appeared in a data breach. Please choose a different password." }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Create User via Supabase Admin API
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
       throw new Error("Missing Supabase env vars");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Use admin.createUser to enforce server-side creation (bypass native signup endpoint)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false
    });

    if (!error && resendApiKey) {
      // Generate the confirmation link
      const linkResponse = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password
      });

      if (linkResponse.data?.properties?.action_link) {
        const actionLink = linkResponse.data.properties.action_link;
        const environment = Deno.env.get('ENVIRONMENT') || 'production';

        if (environment === 'development') {
          // Dev Mode: Log to console and database instead of sending email
          console.log(`[DEV MODE] Verification Link for ${email}: ${actionLink}`);
          
          const { error: insertErr } = await supabase.from('dev_email_logs').insert({
            email: email,
            verification_link: actionLink
          });
          if (insertErr) {
            console.error('Failed to write to dev_email_logs', insertErr);
          }
        } else {
          // Production Mode: Send email via Resend
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'onboarding@resend.dev',
              to: email,
              subject: 'Verify your account',
              html: `<p>Welcome! Please verify your email by clicking the link below:</p><p><a href="${actionLink}">Verify Email</a></p>`
            })
          }).catch(err => console.error('Failed to send Resend email', err));
        }
      }
    }

    if (error) {
      // Anti-enumeration: If user already exists, Supabase throws an error.
      // We should return a generic error if it's a "user already exists" error.
      if (error.message.includes('already exists') || error.status === 422) {
          // Actually, for signup, returning generic error is tricky because they need to know it failed.
          // The prompt says: "Signup with an email that already has an account -> return a generic, non-revealing error (see Security below), do not create a duplicate."
          return new Response(JSON.stringify({ error: "An account with this email may already exist or another issue occurred." }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }
      throw error;
    }

    return new Response(JSON.stringify({ user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
})
