import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';

export const ManageReviewCycle = ({ cycle, onBack }) => {
  const { activeOrganization } = useOrg();
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeOrganization || !cycle) return;
      setLoading(true);

      // Fetch all memberships in the org
      const { data: membershipsData, error: memError } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          role,
          user_profiles!inner(first_name, last_name, avatar_url)
        `)
        .eq('organization_id', activeOrganization.id);

      if (memError) {
        console.error("Error fetching memberships", memError);
      } else {
        setMembers(membershipsData);
      }

      // Fetch existing assignments for this cycle
      const { data: reviewsData, error: revError } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('cycle_id', cycle.id);

      if (revError) {
        console.error("Error fetching reviews", revError);
      } else {
        setAssignments(reviewsData);
      }

      setLoading(false);
    };

    fetchData();
  }, [activeOrganization, cycle]);

  const handleAssign = async (revieweeId, reviewerId) => {
    if (!reviewerId) {
      alert("Please select a reviewer");
      return;
    }

    const { data, error } = await supabase
      .from('performance_reviews')
      .insert({
        cycle_id: cycle.id,
        organization_id: activeOrganization.id,
        reviewee_id: revieweeId,
        reviewer_id: reviewerId,
        status: 'Pending Self-Review'
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert('Error assigning review');
    } else {
      setAssignments([...assignments, data]);
    }
  };

  const handleRemove = async (reviewId) => {
    const { error } = await supabase
      .from('performance_reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error(error);
      alert('Error removing review');
    } else {
      setAssignments(assignments.filter(a => a.id !== reviewId));
    }
  };

  if (loading) return <div>Loading details...</div>;

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-md">
        <button 
          onClick={onBack}
          className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container-high transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface">Manage Cycle: {cycle.name}</h2>
          <p className="text-body-md text-on-surface-variant">Assign reviews to employees and specify their manager/reviewer.</p>
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                <th className="p-md font-label-lg text-on-surface-variant">Employee</th>
                <th className="p-md font-label-lg text-on-surface-variant">Role</th>
                <th className="p-md font-label-lg text-on-surface-variant">Reviewer (Manager)</th>
                <th className="p-md font-label-lg text-on-surface-variant text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const profile = member.user_profiles;
                const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown' : 'Unknown';
                const existingAssignment = assignments.find(a => a.reviewee_id === member.id);
                
                return (
                  <tr key={member.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-lowest transition-colors">
                    <td className="p-md">
                      <div className="flex items-center gap-md">
                        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold overflow-hidden text-xs">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            name.charAt(0) || 'U'
                          )}
                        </div>
                        <span className="font-medium text-on-surface">{name}</span>
                      </div>
                    </td>
                    <td className="p-md text-on-surface-variant text-body-sm capitalize">{member.role?.replace('_', ' ')}</td>
                    <td className="p-md">
                      {existingAssignment ? (
                        <div className="text-body-sm text-on-surface">
                          {(() => {
                            const reviewer = members.find(m => m.id === existingAssignment.reviewer_id);
                            if (reviewer && reviewer.user_profiles) {
                              return `${reviewer.user_profiles.first_name || ''} ${reviewer.user_profiles.last_name || ''}`.trim();
                            }
                            return 'Unknown';
                          })()}
                        </div>
                      ) : (
                        <select 
                          id={`reviewer-${member.id}`}
                          className="w-full max-w-[200px] bg-surface border border-outline rounded-md px-sm py-xs text-on-surface text-body-sm"
                          defaultValue=""
                        >
                          <option value="" disabled>Select Reviewer</option>
                          {members.filter(m => m.id !== member.id).map(m => {
                            const p = m.user_profiles;
                            const n = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown';
                            return <option key={m.id} value={m.id}>{n}</option>
                          })}
                        </select>
                      )}
                    </td>
                    <td className="p-md text-right">
                      {existingAssignment ? (
                        <button 
                          onClick={() => handleRemove(existingAssignment.id)}
                          className="text-error hover:bg-error-container hover:text-on-error-container px-sm py-xs rounded-md transition-colors text-label-sm font-medium"
                        >
                          Remove
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            const select = document.getElementById(`reviewer-${member.id}`);
                            handleAssign(member.id, select.value);
                          }}
                          className="text-primary hover:bg-primary-container hover:text-on-primary-container px-sm py-xs rounded-md transition-colors text-label-sm font-medium"
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
