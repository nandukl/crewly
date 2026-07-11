import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  console.log('Fetching structure_nodes...');
  const { data, error } = await supabase.from('structure_nodes').select('*');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

checkDb();
