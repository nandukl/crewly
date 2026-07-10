import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';

export const HelpDeskDashboard = () => {
  const { activeOrganization } = useOrg();
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    waitingOnUser: 0,
    resolved: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOrganization) fetchStats();
  }, [activeOrganization]);

  const fetchStats = async () => {
    setLoading(true);
    // Simple counts for the dashboard
    const { data } = await supabase
      .from('hd_tickets')
      .select('status')
      .eq('organization_id', activeOrganization.id);
      
    if (data) {
      const counts = data.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        acc.total += 1;
        return acc;
      }, { open: 0, in_progress: 0, waiting_on_user: 0, resolved: 0, closed: 0, total: 0 });
      
      setStats({
        open: counts.open || 0,
        inProgress: counts.in_progress || 0,
        waitingOnUser: counts.waiting_on_user || 0,
        resolved: counts.resolved || 0,
        total: counts.total
      });
    }
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;

  return (
    <div className="space-y-xl max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-error-container/20 p-lg rounded-xl border border-error/30">
          <p className="text-label-md text-error mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">new_releases</span>
            Open Tickets
          </p>
          <p className="text-display-md font-bold text-error">{stats.open}</p>
        </div>
        
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
            In Progress
          </p>
          <p className="text-display-md font-bold text-primary">{stats.inProgress}</p>
        </div>

        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            Waiting on User
          </p>
          <p className="text-display-md font-bold text-on-surface">{stats.waitingOnUser}</p>
        </div>
        
        <div className="bg-green-50 p-lg rounded-xl border border-green-200">
          <p className="text-label-md text-green-700 mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            Resolved (Recent)
          </p>
          <p className="text-display-md font-bold text-green-700">{stats.resolved}</p>
        </div>
      </div>
    </div>
  );
};
