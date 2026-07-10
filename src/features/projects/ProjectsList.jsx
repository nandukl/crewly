import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';

export const ProjectsList = ({ onSelectProject }) => {
  const { activeOrganization } = useOrg();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (activeOrganization) fetchProjects();
  }, [activeOrganization]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pm_projects')
      .select('*, crm_accounts(name)')
      .eq('organization_id', activeOrganization.id)
      .order('created_at', { ascending: false });
      
    if (!error) setProjects(data || []);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('pm_projects')
      .insert({
        organization_id: activeOrganization.id,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      });

    if (!error) {
      setShowForm(false);
      setFormData({ name: '', description: '', status: 'planning', start_date: '', end_date: '' });
      fetchProjects();
    } else {
      alert(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      planning: 'bg-blue-100 text-blue-800 border-blue-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      on_hold: 'bg-amber-100 text-amber-800 border-amber-200',
      completed: 'bg-purple-100 text-purple-800 border-purple-200',
      archived: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || colors.planning}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) return <div className="animate-pulse">Loading projects...</div>;

  return (
    <div className="space-y-lg max-w-7xl">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">All Projects</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <span className="material-symbols-outlined mr-2">add</span>
          New Project
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container p-xl rounded-xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-md shadow-sm">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-on-surface mb-1">Project Name</label>
            <input required type="text" className="w-full border rounded-md px-3 py-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-on-surface mb-1">Description</label>
            <textarea className="w-full border rounded-md px-3 py-2" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Status</label>
            <select className="w-full border rounded-md px-3 py-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Start Date</label>
              <input type="date" className="w-full border rounded-md px-3 py-2" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">End Date</label>
              <input type="date" className="w-full border rounded-md px-3 py-2" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {projects.length === 0 && !showForm && (
          <div className="col-span-full py-xl text-center text-on-surface-variant border border-dashed rounded-xl bg-surface-container-lowest">
            No projects found. Create one to get started!
          </div>
        )}
        
        {projects.map(project => (
          <div 
            key={project.id} 
            onClick={() => onSelectProject(project.id)}
            className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md hover:border-primary transition-all cursor-pointer flex flex-col"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-title-md font-bold text-on-surface line-clamp-1">{project.name}</h3>
              {getStatusBadge(project.status)}
            </div>
            <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-4 flex-1">
              {project.description || 'No description provided.'}
            </p>
            <div className="flex justify-between items-end pt-4 border-t border-outline-variant text-xs text-on-surface-variant">
              <div>
                {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No start date'}
                {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
              </div>
              {project.crm_accounts?.name && (
                <div className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-[14px]">business</span>
                  {project.crm_accounts.name}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
