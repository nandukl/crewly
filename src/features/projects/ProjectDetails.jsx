import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];

export const ProjectDetails = ({ projectId, onBack }) => {
  const { activeOrganization } = useOrg();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee_id: '',
    due_date: ''
  });

  useEffect(() => {
    if (activeOrganization && projectId) {
      fetchData();
    }
  }, [activeOrganization, projectId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch project
    const { data: pData } = await supabase
      .from('pm_projects')
      .select('*, crm_accounts(name)')
      .eq('id', projectId)
      .single();
    setProject(pData);

    // Fetch tasks
    const { data: tData } = await supabase
      .from('pm_tasks')
      .select('*, user_profiles(first_name, last_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setTasks(tData || []);

    // Fetch assignable users (all org members for MVP)
    const { data: uData } = await supabase
      .from('memberships')
      .select('user_id, user_profiles(first_name, last_name)')
      .eq('organization_id', activeOrganization.id)
      .eq('status', 'active');
      
    if (uData) {
      setUsers(uData.map(m => ({
        id: m.user_id,
        name: m.user_profiles ? `${m.user_profiles.first_name || ''} ${m.user_profiles.last_name || ''}`.trim() : 'Unknown'
      })));
    }

    setLoading(false);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('pm_tasks')
      .insert({
        organization_id: activeOrganization.id,
        project_id: projectId,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assignee_id: newTask.assignee_id || null,
        due_date: newTask.due_date || null
      });

    if (!error) {
      setShowTaskForm(false);
      setNewTask({ title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', due_date: '' });
      fetchData();
    } else {
      alert(error.message);
    }
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

  if (loading) return <div className="animate-pulse p-xl">Loading project details...</div>;
  if (!project) return <div className="p-xl text-error">Project not found.</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-xl py-lg border-b border-outline-variant flex items-center justify-between bg-surface">
        <div className="flex items-center gap-md">
          <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
              {project.name}
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container-high border border-outline-variant uppercase">
                {project.status.replace('_', ' ')}
              </span>
            </h2>
            {project.crm_accounts?.name && (
              <p className="text-sm text-primary flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">business</span>
                Client: {project.crm_accounts.name}
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowTaskForm(true)}>
          <span className="material-symbols-outlined mr-2">add_task</span>
          Add Task
        </Button>
      </div>

      {showTaskForm && (
        <div className="p-xl bg-surface-container-lowest border-b border-outline-variant shadow-sm">
          <form onSubmit={handleCreateTask} className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="col-span-full">
              <label className="block text-sm font-medium text-on-surface mb-1">Task Title</label>
              <input required type="text" className="w-full border rounded-md px-3 py-2" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-on-surface mb-1">Description</label>
              <textarea className="w-full border rounded-md px-3 py-2" rows="2" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Assignee</label>
              <select className="w-full border rounded-md px-3 py-2" value={newTask.assignee_id} onChange={e => setNewTask({...newTask, assignee_id: e.target.value})}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Priority</label>
              <select className="w-full border rounded-md px-3 py-2" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Due Date</label>
              <input type="date" className="w-full border rounded-md px-3 py-2" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
            </div>
            <div className="col-span-full flex justify-end gap-3 mt-2">
              <Button variant="outline" type="button" onClick={() => setShowTaskForm(false)}>Cancel</Button>
              <Button type="submit">Create Task</Button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-lg bg-surface-container-lowest">
        <div className="flex gap-lg h-full min-w-max pb-4">
          {STATUSES.map(status => {
            const statusTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} className="w-80 flex flex-col bg-surface-container/50 rounded-xl border border-outline-variant shadow-sm overflow-hidden h-full">
                <div className="px-md py-sm border-b border-outline-variant bg-surface flex justify-between items-center sticky top-0">
                  <h3 className="font-title-sm font-bold text-on-surface uppercase tracking-wider">
                    {status.replace('_', ' ')}
                  </h3>
                  <span className="bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded-full text-xs font-bold">
                    {statusTasks.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-sm space-y-sm">
                  {statusTasks.map(task => (
                    <div key={task.id} className="bg-surface p-sm rounded-lg shadow border border-outline-variant hover:border-primary transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          task.priority === 'urgent' ? 'bg-error-container text-error' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.priority}
                        </span>
                        
                        <select 
                          value={task.status} 
                          onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                          className="text-xs bg-transparent text-on-surface-variant border-none cursor-pointer focus:ring-0"
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      </div>
                      <h4 className="font-title-sm text-on-surface line-clamp-2 mt-2">{task.title}</h4>
                      
                      <div className="flex justify-between items-end mt-4 text-xs text-on-surface-variant">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                        </div>
                        {task.user_profiles && (
                          <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-full">
                            <span className="material-symbols-outlined text-[12px]">person</span>
                            <span className="font-medium truncate max-w-[80px]">
                              {task.user_profiles.first_name} {task.user_profiles.last_name?.charAt(0)}.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {statusTasks.length === 0 && (
                    <div className="text-center p-md text-sm text-on-surface-variant italic opacity-70 border-2 border-dashed border-outline-variant/50 rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
