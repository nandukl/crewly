import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';

export const StockOperations = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'receipt',
    item_id: '',
    quantity: 1,
    from_location_id: '',
    to_location_id: '',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    if (activeOrganization) fetchData();
  }, [activeOrganization]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch lookup data
    const [{ data: iData }, { data: lData }, { data: mData }] = await Promise.all([
      supabase.from('inv_items').select('id, name, sku').eq('organization_id', activeOrganization.id),
      supabase.from('inv_locations').select('id, name, type').eq('organization_id', activeOrganization.id),
      supabase.from('inv_movements')
        .select('*, inv_items(name, sku), from_loc:from_location_id(name), to_loc:to_location_id(name), creator:created_by(first_name, last_name)')
        .eq('organization_id', activeOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);
    
    if (iData) setItems(iData);
    if (lData) setLocations(lData);
    if (mData) setMovements(mData);
    
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }
    if (formData.type === 'transfer' && formData.from_location_id === formData.to_location_id) {
      alert("Source and destination locations cannot be the same.");
      return;
    }

    // Prepare payload
    let payload = {
      organization_id: activeOrganization.id,
      item_id: formData.item_id,
      quantity: formData.quantity,
      type: formData.type,
      reference_number: formData.reference_number || null,
      notes: formData.notes || null,
      created_by: currentMembership.employee_profiles?.[0]?.id,
      from_location_id: formData.from_location_id || null,
      to_location_id: formData.to_location_id || null
    };

    // Clean up unneeded location IDs based on type
    if (formData.type === 'receipt') payload.from_location_id = null;
    if (formData.type === 'shipment') payload.to_location_id = null;
    
    // For adjustments, we expect either a positive (to) or negative (from) adjustment. We'll simplify UI by forcing the user to pick where it's happening and if it's an add/remove via two different types. But the schema expects 'adjustment'. Let's assume standard adjustment is a receipt (found stock). We'll map 'write_off' to adjustment from_location.
    // Actually, schema enum is ('receipt', 'shipment', 'transfer', 'adjustment').
    // In our UI, if type is 'adjustment_add', we save as 'adjustment' with to_location.
    // If 'adjustment_remove', we save as 'adjustment' with from_location.
    if (formData.type === 'adjustment_add') {
      payload.type = 'adjustment';
      payload.from_location_id = null;
    } else if (formData.type === 'adjustment_remove') {
      payload.type = 'adjustment';
      payload.to_location_id = null;
    }

    const { error } = await supabase.from('inv_movements').insert(payload);

    if (!error) {
      setShowForm(false);
      setFormData({ type: 'receipt', item_id: '', quantity: 1, from_location_id: '', to_location_id: '', reference_number: '', notes: '' });
      fetchData(); // Refresh history
    } else {
      alert(error.message);
    }
  };

  const getTypeBadge = (type, rawPayload) => {
    // rawPayload is used to differentiate adjustment types if needed
    let display = type;
    let color = 'bg-gray-100 text-gray-800';
    
    if (type === 'receipt') { display = 'Receipt'; color = 'bg-blue-100 text-blue-800'; }
    if (type === 'shipment') { display = 'Shipment'; color = 'bg-purple-100 text-purple-800'; }
    if (type === 'transfer') { display = 'Transfer'; color = 'bg-amber-100 text-amber-800'; }
    if (type === 'adjustment') { 
      display = 'Adjustment'; 
      color = 'bg-error-container text-error'; 
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color}`}>
        {display}
      </span>
    );
  };

  if (loading) return <div className="animate-pulse">Loading operations...</div>;

  return (
    <div className="space-y-lg max-w-[1200px]">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">Stock Ledger</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <span className="material-symbols-outlined mr-2">add</span>
          Record Movement
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container p-xl rounded-xl border border-outline-variant shadow-sm max-w-[800px]">
          <h3 className="font-title-md text-on-surface mb-md">New Stock Movement</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Movement Type</label>
              <select className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="receipt">Receipt (Add to location)</option>
                <option value="shipment">Shipment (Remove from location)</option>
                <option value="transfer">Transfer (Move between locations)</option>
                <option value="adjustment_add">Adjustment (Found stock)</option>
                <option value="adjustment_remove">Adjustment (Lost/Damaged)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Item (SKU)</label>
              <select required className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.item_id} onChange={e => setFormData({...formData, item_id: e.target.value})}>
                <option value="">Select Item...</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.sku} - {i.name}</option>)}
              </select>
            </div>
            
            {['shipment', 'transfer', 'adjustment_remove'].includes(formData.type) && (
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Source Location</label>
                <select required className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.from_location_id} onChange={e => setFormData({...formData, from_location_id: e.target.value})}>
                  <option value="">Select Source...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            
            {['receipt', 'transfer', 'adjustment_add'].includes(formData.type) && (
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Destination Location</label>
                <select required className="w-full border rounded-md px-3 py-2 bg-surface" value={formData.to_location_id} onChange={e => setFormData({...formData, to_location_id: e.target.value})}>
                  <option value="">Select Destination...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Quantity</label>
              <input required type="number" min="1" className="w-full border rounded-md px-3 py-2" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value, 10)})} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Reference No. (PO/Invoice)</label>
              <input type="text" className="w-full border rounded-md px-3 py-2" value={formData.reference_number} onChange={e => setFormData({...formData, reference_number: e.target.value})} />
            </div>
          </div>
          
          <div className="mb-md">
            <label className="block text-sm font-medium text-on-surface mb-1">Notes</label>
            <input type="text" className="w-full border rounded-md px-3 py-2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Reason for adjustment, driver name, etc." />
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Record Movement</Button>
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Date</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Item</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Type</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Qty</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase pl-8">Movement Details</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {movements.length === 0 ? (
              <tr><td colSpan="6" className="px-lg py-xl text-center text-on-surface-variant">No movements recorded yet.</td></tr>
            ) : movements.map(mov => (
              <tr key={mov.id} className="hover:bg-surface-container/50 transition-colors text-sm">
                <td className="px-lg py-md text-on-surface-variant whitespace-nowrap">
                  {new Date(mov.created_at).toLocaleString()}
                </td>
                <td className="px-lg py-md">
                  <div className="font-bold text-on-surface">{mov.inv_items?.name}</div>
                  <div className="text-xs text-on-surface-variant font-mono">{mov.inv_items?.sku}</div>
                </td>
                <td className="px-lg py-md">
                  {getTypeBadge(mov.type)}
                  {mov.reference_number && <div className="text-[10px] text-on-surface-variant mt-1 font-mono">Ref: {mov.reference_number}</div>}
                </td>
                <td className="px-lg py-md text-right font-bold text-on-surface">
                  {mov.quantity}
                </td>
                <td className="px-lg py-md pl-8">
                  {mov.type === 'receipt' && <span className="text-green-700 font-medium">→ {mov.to_loc?.name}</span>}
                  {mov.type === 'shipment' && <span className="text-purple-700 font-medium">{mov.from_loc?.name} → Out</span>}
                  {mov.type === 'transfer' && <span className="text-amber-700 font-medium">{mov.from_loc?.name} → {mov.to_loc?.name}</span>}
                  {mov.type === 'adjustment' && mov.to_location_id && <span className="text-error font-medium">Found: +{mov.quantity} at {mov.to_loc?.name}</span>}
                  {mov.type === 'adjustment' && mov.from_location_id && <span className="text-error font-medium">Lost/Dmg: -{mov.quantity} from {mov.from_loc?.name}</span>}
                  
                  {mov.notes && <div className="text-xs text-on-surface-variant italic mt-1">{mov.notes}</div>}
                </td>
                <td className="px-lg py-md text-xs text-on-surface-variant">
                  {mov.creator ? `${mov.creator.first_name} ${mov.creator.last_name}` : 'System'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
