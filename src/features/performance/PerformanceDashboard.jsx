import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { ManageReviewCycle } from './ManageReviewCycle';

import { useSubscriptionGate } from '../billing/useSubscriptionGate';

export const PerformanceDashboard = () => {
  const { activeOrganization } = useOrg();
  const { checkWriteAccess } = useSubscriptionGate();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  const [managingCycle, setManagingCycle] = useState(null);
  
  const [newCycle, setNewCycle] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'Draft'
  });

  const fetchCycles = async () => {
    if (!activeOrganization) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('review_cycles')
      .select('*')
      .eq('organization_id', activeOrganization.id)
      .order('start_date', { ascending: false });
    
    if (!error && data) {
      setCycles(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCycles();
  }, [activeOrganization]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!checkWriteAccess()) return;
    if (!activeOrganization) return;
    
    const { error } = await supabase
      .from('review_cycles')
      .insert({
        organization_id: activeOrganization.id,
        name: newCycle.name,
        start_date: newCycle.start_date,
        end_date: newCycle.end_date,
        status: newCycle.status
      });

    if (!error) {
      setShowCreate(false);
      setNewCycle({ name: '', start_date: '', end_date: '', status: 'Draft' });
      fetchCycles();
    } else {
      console.error(error);
      alert('Error creating review cycle');
    }
  };

  if (loading) return <div>Loading cycles...</div>;

  if (managingCycle) {
    return <ManageReviewCycle cycle={managingCycle} onBack={() => setManagingCycle(null)} />;
  }

  return (
    <div className="space-y-lg">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">Review Cycles</h2>
        <button 
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary text-on-primary px-md py-sm rounded-lg font-label-md hover:bg-primary/90 transition-colors"
        >
          {showCreate ? 'Cancel' : 'Create Cycle'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-surface-container p-md rounded-xl space-y-md border border-outline-variant">
          <h3 className="font-title-md text-on-surface">New Review Cycle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div>
              <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Cycle Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Q1 2024 Performance Review"
                className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface"
                value={newCycle.name}
                onChange={(e) => setNewCycle({...newCycle, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Status</label>
              <select
                className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface"
                value={newCycle.status}
                onChange={(e) => setNewCycle({...newCycle, status: e.target.value})}
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">Start Date</label>
              <input 
                required
                type="date" 
                className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface"
                value={newCycle.start_date}
                onChange={(e) => setNewCycle({...newCycle, start_date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-label-sm font-medium text-on-surface-variant mb-xs">End Date</label>
              <input 
                required
                type="date" 
                className="w-full bg-surface border border-outline rounded-md px-sm py-sm text-on-surface"
                value={newCycle.end_date}
                onChange={(e) => setNewCycle({...newCycle, end_date: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="bg-primary text-on-primary px-md py-sm rounded-md font-label-md hover:bg-primary/90">
            Save Cycle
          </button>
        </form>
      )}

      {cycles.length === 0 ? (
        <div className="text-center p-xl text-on-surface-variant bg-surface-container-low rounded-xl border border-outline-variant border-dashed">
          No review cycles found. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {cycles.map(cycle => (
            <div key={cycle.id} className="bg-surface-container-low p-md rounded-xl border border-outline-variant flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-sm">
                  <h4 className="font-title-md font-bold text-on-surface">{cycle.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    cycle.status === 'Active' ? 'bg-green-100 text-green-800' :
                    cycle.status === 'Completed' ? 'bg-gray-200 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {cycle.status}
                  </span>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-md pt-md border-t border-outline-variant flex justify-between items-center">
                <span 
                  onClick={() => setManagingCycle(cycle)}
                  className="text-label-sm text-secondary cursor-pointer hover:underline"
                >
                  Manage Reviews
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

  );
};
