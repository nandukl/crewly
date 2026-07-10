import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/formatCurrency';

export const ItemsList = () => {
  const { activeOrganization } = useOrg();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', unit_price: 0, min_stock_level: 0
  });

  useEffect(() => {
    if (activeOrganization) fetchItems();
  }, [activeOrganization]);

  const fetchItems = async () => {
    setLoading(true);
    // Fetch items with aggregate stock
    const { data: itemsData, error } = await supabase
      .from('inv_items')
      .select('*, inv_stock_levels(quantity)')
      .eq('organization_id', activeOrganization.id)
      .order('name');
      
    if (!error && itemsData) {
      // Map to include total stock across all locations
      const processed = itemsData.map(item => {
        const totalStock = item.inv_stock_levels?.reduce((sum, level) => sum + level.quantity, 0) || 0;
        return { ...item, totalStock };
      });
      setItems(processed);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('inv_items')
      .insert({
        organization_id: activeOrganization.id,
        name: formData.name,
        sku: formData.sku,
        category: formData.category || 'General',
        unit_price: formData.unit_price,
        min_stock_level: formData.min_stock_level
      });

    if (!error) {
      setShowForm(false);
      setFormData({ name: '', sku: '', category: '', unit_price: 0, min_stock_level: 0 });
      fetchItems();
    } else {
      alert(error.message);
    }
  };

  if (loading) return <div className="animate-pulse">Loading catalog...</div>;

  return (
    <div className="space-y-lg max-w-[1200px]">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">Item Catalog</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <span className="material-symbols-outlined mr-2">add</span>
          New Item
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container p-xl rounded-xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-md shadow-sm">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Item Name</label>
            <input required type="text" className="w-full border rounded-md px-3 py-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">SKU (Unique)</label>
            <input required type="text" className="w-full border rounded-md px-3 py-2" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Category</label>
            <input type="text" className="w-full border rounded-md px-3 py-2" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Hardware" />
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Unit Price</label>
              <input required type="number" step="0.01" min="0" className="w-full border rounded-md px-3 py-2" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Min Stock Level</label>
              <input required type="number" min="0" className="w-full border rounded-md px-3 py-2" value={formData.min_stock_level} onChange={e => setFormData({...formData, min_stock_level: parseInt(e.target.value, 10)})} />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Item</Button>
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">SKU / Item</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Category</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Unit Price</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">In Stock</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {items.length === 0 ? (
              <tr><td colSpan="5" className="px-lg py-xl text-center text-on-surface-variant">No items in catalog.</td></tr>
            ) : items.map(item => {
              const isLow = item.totalStock < item.min_stock_level;
              return (
                <tr key={item.id} className="hover:bg-surface-container/50 transition-colors">
                  <td className="px-lg py-md">
                    <div className="font-mono text-xs text-on-surface-variant mb-1">{item.sku}</div>
                    <div className="font-title-sm font-bold text-on-surface">{item.name}</div>
                  </td>
                  <td className="px-lg py-md text-sm text-on-surface-variant">{item.category}</td>
                  <td className="px-lg py-md text-sm text-right text-on-surface">{formatCurrency(item.unit_price, activeOrganization.currency)}</td>
                  <td className={`px-lg py-md text-sm text-right font-bold ${isLow ? 'text-error' : 'text-on-surface'}`}>
                    {item.totalStock}
                  </td>
                  <td className="px-lg py-md text-right">
                    {isLow ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error-container text-error">Low Stock</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800">Healthy</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
