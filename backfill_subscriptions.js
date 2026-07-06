import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function backfill() {
  console.log("Fetching organizations without subscriptions...");
  
  // Get all orgs
  const { data: orgs, error: orgsError } = await supabase.from('organizations').select('id');
  if (orgsError) throw orgsError;

  // Get all subscriptions
  const { data: subs, error: subsError } = await supabase.from('subscriptions').select('organization_id');
  if (subsError) throw subsError;

  const subOrgIds = new Set(subs.map(s => s.organization_id));
  const missingOrgs = orgs.filter(o => !subOrgIds.has(o.id));

  if (missingOrgs.length === 0) {
    console.log("All organizations already have a subscription row.");
    return;
  }

  console.log(`Found ${missingOrgs.length} organizations missing a subscription row. Backfilling...`);

  const rowsToInsert = missingOrgs.map(org => ({
    organization_id: org.id,
    status: 'trial',
    trial_started_at: new Date().toISOString(),
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { error: insertError } = await supabase.from('subscriptions').insert(rowsToInsert);
  
  if (insertError) {
    console.error("Backfill failed:", insertError);
  } else {
    console.log("Backfill successful!");
  }
}

backfill();
