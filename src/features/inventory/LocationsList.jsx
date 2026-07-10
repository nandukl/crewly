import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';

export const LocationsList = () => {
  const { activeOrganization } = useOrg();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', type: 'warehouse', address: ''
  });

  useEffect(() => {
    if (activeOrganization) fetchLocations();
  }, [activeOrganization]);

  const fetchLocations = async () => {
    setLoading(true);
    const { data: locs, error } = await supabase
      .from('inv_locations')
      .select('*, inv_stock_levels(quantity)')
      .eq('organization_id', activeOrganization.id)
      .order('name');
      
    if (!error && locs) {
      const processed = locs.map(loc => {
        const totalItems = loc.inv_stock_levels?.reduce((sum, level) => sum + level.quantity, 0) || 0;
        return { ...loc, totalItems };
      });
      setLocations(processed);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('inv_locations')
      .insert({
        organization_id: activeOrganization.id,
        name: formData.name,
        type: formData.type,
        address: formData.address
      });

    if (!error) {
      setShowForm(false);
      setFormData({ name: '', type: 'warehouse', address: '' });
      fetchLocations();
    } else {
      alert(error.message);
    }
  };

  if (loading) return <div className="animate-pulse">Loading locations...</div>;

  return (
    <div className="space-y-lg max-w-[1200px]">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">Storage Locations</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <span className="material-symbols-outlined mr-2">add_location</span>
          New Location
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container p-xl rounded-xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-md shadow-sm">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Location Name</label>
            <input required type="text" className="w-full border rounded-md px-3 py-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Main Warehouse" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Type</label>
            <select className="w-full border rounded-md px-3 py-2" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="warehouse">Warehouse</option>
              <option value="storefront">Storefront</option>
              <option value="office">Office</option>
              <option value="virtual">Virtual</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-on-surface mb-1">Address / Details</label>
            <textarea className="w-full border rounded-md px-3 py-2" rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>
          <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-2">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Location</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {locations.length === 0 ? (
          <div className="col-span-full py-xl text-center text-on-surface-variant border border-dashed rounded-xl bg-surface-container-lowest">
            No locations found.
          </div>
        ) : locations.map(loc => (
          <div key={loc.id} className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {loc.type === 'warehouse' ? 'warehouse' : loc.type === 'storefront' ? 'storefront' : loc.type === 'virtual' ? 'cloud' : 'business'}
                </span>
                {loc.name}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant">
                {loc.type}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant line-clamp-2 flex-1 mb-4">
              {loc.address || 'No address provided'}
            </p>
            <div className="pt-3 border-t border-outline-variant flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Items Stored:</span>
              <span className="font-bold text-primary">{loc.totalItems} units</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
