import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNames() {
  console.log('Fetching users from auth.users...');
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  console.log(`Found ${users.length} users. Updating user_profiles...`);
  
  for (const user of users) {
    const fullName = user.user_metadata?.name || user.user_metadata?.full_name;
    const avatarUrl = user.user_metadata?.avatar_url;
    
    if (fullName) {
      console.log(`Updating ${user.email} with name ${fullName}`);
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName, avatar_url: avatarUrl || null })
        .eq('id', user.id);
        
      if (error) {
         if (error.code === 'PGRST204') {
             console.log(`Column full_name does not exist on user_profiles!`);
             return;
         }
         console.error(`Error updating ${user.email}:`, error);
      }
    }
  }
  
  console.log('Done!');
}

fixNames();
