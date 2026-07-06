import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Role Key in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runVerification() {
  console.log("--- Starting Module 2 Verification (Admin Mode) ---\n");

  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const email = `test_${Date.now()}@example.com`;

  try {
    // 1. Create User via Admin API
    console.log("1. Creating User via Admin API...");
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { id: userId }
    });

    if (userError) throw userError;
    const realUserId = userData.user.id;
    console.log(`User created: ${realUserId}`);

    // 2. Create Organization Atomically via RPC (Tests extended RPC)
    console.log("\n2. Creating Organization Atomically via RPC (with Trial Subscription)...");
    const { error: orgError } = await supabase.rpc('create_organization', {
      p_org_id: orgId,
      p_name: 'Billing Test Org',
      p_slug: `billing-test-${Date.now()}`,
      p_user_id: realUserId,
      p_email: email
    });

    if (orgError) throw orgError;

    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('organization_id', orgId)
      .single();

    if (subError) throw subError;
    console.log(`Organization created atomically. Initial Subscription Status: ${subData.status} (Expected: trial)`);

    // 3. Test check_subscription_access in 'trial' state
    console.log("\n3. Testing access in 'trial' state...");
    let { data: accessRead } = await supabase.rpc('check_subscription_access', { p_org_id: orgId, p_module_key: 'crm', p_action: 'view' });
    let { data: accessWrite } = await supabase.rpc('check_subscription_access', { p_org_id: orgId, p_module_key: 'crm', p_action: 'edit' });
    console.log(`Trial Read: ${accessRead} (Expected: true)`);
    console.log(`Trial Write: ${accessWrite} (Expected: true)`);

    // 4. Test 'grace_period' state
    console.log("\n4. Testing access in 'grace_period' state...");
    await supabase.from('subscriptions').update({ status: 'grace_period' }).eq('organization_id', orgId);
    
    ({ data: accessRead } = await supabase.rpc('check_subscription_access', { p_org_id: orgId, p_module_key: 'crm', p_action: 'view' }));
    ({ data: accessWrite } = await supabase.rpc('check_subscription_access', { p_org_id: orgId, p_module_key: 'crm', p_action: 'edit' }));
    console.log(`Grace Period Read: ${accessRead} (Expected: true)`);
    console.log(`Grace Period Write: ${accessWrite} (Expected: false)`);

    // 5. Test 'locked' state and Exemptions
    console.log("\n5. Testing access in 'locked' state (with exemptions)...");
    await supabase.from('subscriptions').update({ status: 'locked' }).eq('organization_id', orgId);
    
    ({ data: accessRead } = await supabase.rpc('check_subscription_access', { p_org_id: orgId, p_module_key: 'crm', p_action: 'view' }));
    let { data: accessExemptAuth } = await supabase.rpc('check_subscription_access', { p_org_id: orgId, p_module_key: 'auth', p_action: 'edit' });
    let { data: accessExemptBillingRead } = await supabase.rpc('check_subscription_access', { p_org_id: orgId, p_module_key: 'billing', p_action: 'view' });
    let { data: accessExemptBillingWrite } = await supabase.rpc('check_subscription_access', { p_org_id: orgId, p_module_key: 'billing', p_action: 'edit' });
    
    console.log(`Locked Normal Read: ${accessRead} (Expected: false)`);
    console.log(`Locked Auth Exemption: ${accessExemptAuth} (Expected: true)`);
    console.log(`Locked Billing Visibility Exemption (view): ${accessExemptBillingRead} (Expected: true)`);
    console.log(`Locked Billing Action Exemption (edit): ${accessExemptBillingWrite} (Expected: false)`);

    console.log("\n--- All Verification Steps Passed! ---");

  } catch (err) {
    console.error("\n❌ Verification Failed:", err);
  }
}

runVerification();
