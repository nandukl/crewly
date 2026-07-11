import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  console.log('Checking for create_structure_node with real UUID...');
  const { data, error } = await supabase.rpc('create_structure_node', {
    p_org_id: '00000000-0000-0000-0000-000000000000',
    p_parent_id: '11111111-1111-1111-1111-111111111111',
    p_name: 'Test',
    p_type: 'branch'
  });
  
  if (error) {
    console.error('Error calling RPC:', error);
  } else {
    console.log('Success!', data);
  }
}

checkDb();
