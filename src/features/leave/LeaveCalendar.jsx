import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { supabase } from '../../lib/supabaseClient';

export const LeaveCalendar = () => {
  const { activeOrganization } = useOrg();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For a simple v1 calendar, we'll just show upcoming approved leaves in a list/timeline view
  // rather than building a complex grid calendar component from scratch.
  
  useEffect(() => {
    if (!activeOrganization) return;
    
    const fetchLeaves = async () => {
      try {
        setLoading(true);
        // Get all approved leaves from today onwards
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('leave_requests')
          .select(`
            *,
            leave_types(name),
            employee_profiles(
              id,
              memberships(user_id)
            )
          `)
          .eq('organization_id', activeOrganization.id)
          .eq('status', 'Approved')
          .gte('end_date', today)
          .order('start_date', { ascending: true });

        if (error) throw error;
        
        const userIds = data.map(req => req.employee_profiles?.memberships?.user_id).filter(Boolean);
        let userProfiles = [];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('user_profiles').select('id, full_name').in('id', userIds);
          if (profiles) userProfiles = profiles;
        }

        const enrichedData = data.map(req => {
          const profile = userProfiles.find(p => p.id === req.employee_profiles?.memberships?.user_id);
          return {
            ...req,
            employee_profiles: {
               ...req.employee_profiles,
               full_name: profile?.full_name || 'Unknown User'
            }
          };
        });

        setLeaves(enrichedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaves();
  }, [activeOrganization]);

  if (loading) return <div className="py-8">Loading calendar...</div>;
  if (error) return <div className="py-8 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Team Leave Calendar</h2>
        <p className="text-sm text-slate-500 mt-1">Upcoming approved leaves across the organization.</p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-slate-200">
          {leaves.map((leave) => (
            <li key={leave.id} className="p-4 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
                    {leave.employee_profiles?.full_name?.charAt(0) || '?'}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900">
                    {leave.employee_profiles?.full_name}
                  </h3>
                  <div className="mt-1 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{leave.leave_types?.name}</span>
                    <span className="mx-2">&bull;</span>
                    <span>
                      {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                      {leave.days_count} days
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {leaves.length === 0 && (
            <li className="p-8 text-center text-slate-500">No upcoming approved leaves found.</li>
          )}
        </ul>
      </div>
    </div>
  );
};
