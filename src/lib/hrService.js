import { supabase } from './supabaseClient';

export const hrService = {
  getDepartments: async (orgId) => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    if (error) throw error;
    return data;
  },

  createDepartment: async (orgId, name, description) => {
    const { data, error } = await supabase
      .from('departments')
      .insert({ organization_id: orgId, name, description })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getEmployeeDirectory: async (orgId) => {
    // 1. Fetch employee profiles joined with memberships and departments
    const { data: employees, error } = await supabase
      .from('employee_profiles')
      .select(`
        *,
        departments (name),
        memberships!employee_profiles_membership_id_fkey!inner (
          role,
          status,
          user_id,
          email
        )
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // 2. Fetch associated user_profiles manually (since there is no direct FK from memberships to user_profiles)
    const userIds = employees.map(emp => emp.memberships?.user_id).filter(Boolean);
    let userProfiles = [];
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);
      if (!profilesError && profiles) {
        userProfiles = profiles;
      }
    }

    // 3. Map everything together
    return employees.map(profile => {
      const userProfile = userProfiles.find(p => p.id === profile.memberships?.user_id);
      
      return {
        id: profile.id, // employee_profile id
        membershipId: profile.membership_id,
        employeeCode: profile.employee_code,
        designation: profile.designation,
        dateOfJoining: profile.date_of_joining,
        employmentType: profile.employment_type,
        departmentId: profile.department_id,
        departmentName: profile.departments?.name,
        managerId: profile.manager_id,
        fullName: userProfile?.full_name,
        email: userProfile?.email || profile.memberships?.email, // Fallback to invite email
        avatarUrl: userProfile?.avatar_url,
        role: profile.memberships?.role,
        status: profile.memberships?.status
      };
    });
  },

  updateEmployeeProfile: async (id, updates) => {
    const { data, error } = await supabase
      .from('employee_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  removeEmployee: async (membershipId) => {
    const { data, error } = await supabase
      .from('memberships')
      .update({ status: 'removed' })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
