import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';

export const ProjectsDashboard = () => {
  const { activeOrganization } = useOrg();
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0,
    activeTasks: 0,
    overdueTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOrganization) fetchStats();
  }, [activeOrganization]);

  const fetchStats = async () => {
    setLoading(true);
    
    // In a real app, you'd likely use an RPC or aggregate queries for efficiency.
    // Doing multiple simple counts here for the MVP.
    const { count: activeProjectsCount } = await supabase
      .from('pm_projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganization.id)
      .eq('status', 'active');
      
    const { count: completedProjectsCount } = await supabase
      .from('pm_projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganization.id)
      .eq('status', 'completed');
      
    const { count: activeTasksCount } = await supabase
      .from('pm_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganization.id)
      .in('status', ['todo', 'in_progress', 'review']);

    const today = new Date().toISOString().split('T')[0];
    const { count: overdueTasksCount } = await supabase
      .from('pm_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganization.id)
      .in('status', ['todo', 'in_progress', 'review'])
      .lt('due_date', today);

    setStats({
      activeProjects: activeProjectsCount || 0,
      completedProjects: completedProjectsCount || 0,
      activeTasks: activeTasksCount || 0,
      overdueTasks: overdueTasksCount || 0
    });
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading dashboard...</div>;

  return (
    <div className="space-y-xl max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">play_circle</span>
            Active Projects
          </p>
          <p className="text-display-md font-bold text-on-surface">{stats.activeProjects}</p>
        </div>
        
        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Completed Projects
          </p>
          <p className="text-display-md font-bold text-on-surface">{stats.completedProjects}</p>
        </div>

        <div className="bg-surface-container p-lg rounded-xl border border-outline-variant">
          <p className="text-label-md text-on-surface-variant mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">task</span>
            Active Tasks
          </p>
          <p className="text-display-md font-bold text-primary">{stats.activeTasks}</p>
        </div>
        
        <div className="bg-error-container/30 p-lg rounded-xl border border-error/30">
          <p className="text-label-md text-error mb-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            Overdue Tasks
          </p>
          <p className="text-display-md font-bold text-error">{stats.overdueTasks}</p>
        </div>
      </div>
      
      {/* Could add a chart here showing tasks over time or projects by status */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm text-center py-20 mt-lg">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 opacity-50">monitoring</span>
        <h3 className="font-title-lg text-on-surface">Project Analytics</h3>
        <p className="text-on-surface-variant mt-2 max-w-[500px] mx-auto">
          Detailed project analytics, burndown charts, and team velocity will be available here when the Analytics module is activated.
        </p>
      </div>
    </div>
  );
};
