import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';

export const MyTasks = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOrganization && currentMembership) fetchTasks();
  }, [activeOrganization, currentMembership]);

  const fetchTasks = async () => {
    setLoading(true);
    // currentMembership.user_id might be null if pending, but active members should have it
    const { data, error } = await supabase
      .from('pm_tasks')
      .select('*, pm_projects(name)')
      .eq('organization_id', activeOrganization.id)
      .eq('assignee_id', currentMembership.user_id)
      .order('due_date', { ascending: true, nullsFirst: false });
      
    if (!error) setTasks(data || []);
    setLoading(false);
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const { error } = await supabase
      .from('pm_tasks')
      .update({ status: newStatus })
      .eq('id', taskId);
      
    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  if (loading) return <div className="animate-pulse p-xl">Loading your tasks...</div>;

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-xl max-w-5xl">
      <div>
        <h2 className="font-title-lg text-title-lg text-on-surface mb-lg">Active Tasks</h2>
        {activeTasks.length === 0 ? (
          <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-xl text-center text-on-surface-variant">
            You're all caught up! No active tasks assigned to you.
          </div>
        ) : (
          <div className="space-y-sm">
            {activeTasks.map(task => (
              <div key={task.id} className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-primary font-bold uppercase tracking-wider">{task.pm_projects?.name}</span>
                    <span className="text-on-surface-variant">•</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      task.priority === 'urgent' ? 'bg-error-container text-error' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="font-title-md text-on-surface">{task.title}</h4>
                  <p className="text-sm text-on-surface-variant line-clamp-1 mt-1">{task.description}</p>
                </div>
                
                <div className="flex items-center gap-lg">
                  <div className="text-right">
                    <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Due Date</div>
                    <div className={`text-sm font-medium ${task.due_date && new Date(task.due_date) < new Date() ? 'text-error' : 'text-on-surface'}`}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                  
                  <div className="w-40">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Status</label>
                    <select 
                      value={task.status} 
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                      className="w-full border border-outline-variant rounded-md px-2 py-1 text-sm bg-surface"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface mb-lg">Recently Completed</h2>
          <div className="space-y-sm opacity-70">
            {completedTasks.map(task => (
              <div key={task.id} className="bg-surface-container-low p-md rounded-xl border border-outline-variant flex items-center justify-between">
                <div>
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mr-2">{task.pm_projects?.name}</span>
                  <span className="font-medium text-on-surface line-through">{task.title}</span>
                </div>
                <Button variant="outline" onClick={() => updateTaskStatus(task.id, 'todo')}>Reopen</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
