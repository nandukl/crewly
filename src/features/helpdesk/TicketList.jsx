import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';

const CATEGORIES = ['IT Support', 'HR', 'Facilities', 'Billing', 'General'];

export const TicketList = ({ view, onSelectTicket, isAdmin, currentUserId }) => {
  const { activeOrganization } = useOrg();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'IT Support', priority: 'medium' });

  useEffect(() => {
    if (activeOrganization) fetchTickets();
  }, [activeOrganization, view]);

  const fetchTickets = async () => {
    setLoading(true);
    
    let query = supabase
      .from('hd_tickets')
      .select('*, requester:requester_id(first_name, last_name), assignee:assignee_id(first_name, last_name)')
      .eq('organization_id', activeOrganization.id)
      .order('created_at', { ascending: false });

    if (view === 'mine') {
      query = query.eq('requester_id', currentUserId);
    }
    
    const { data, error } = await query;
    if (!error) setTickets(data || []);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('hd_tickets')
      .insert({
        organization_id: activeOrganization.id,
        requester_id: currentUserId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'open'
      });

    if (!error) {
      setShowForm(false);
      setFormData({ title: '', description: '', category: 'IT Support', priority: 'medium' });
      fetchTickets();
    } else {
      alert(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      open: 'bg-error-container text-error',
      in_progress: 'bg-blue-100 text-blue-800',
      waiting_on_user: 'bg-amber-100 text-amber-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-gray-100'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) return <div className="animate-pulse">Loading tickets...</div>;

  return (
    <div className="space-y-lg max-w-7xl">
      <div className="flex justify-between items-center">
        <h2 className="font-title-lg text-title-lg text-on-surface">
          {view === 'queue' ? 'Ticket Queue' : 'My Requests'}
        </h2>
        {view === 'mine' && (
          <Button onClick={() => setShowForm(!showForm)}>
            <span className="material-symbols-outlined mr-2">add</span>
            New Request
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container p-xl rounded-xl border border-outline-variant grid grid-cols-1 md:grid-cols-2 gap-md shadow-sm">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-on-surface mb-1">Subject</label>
            <input required type="text" className="w-full border rounded-md px-3 py-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Brief summary of the issue" />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-on-surface mb-1">Details</label>
            <textarea required className="w-full border rounded-md px-3 py-2" rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Please provide as much detail as possible..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Category</label>
            <select className="w-full border rounded-md px-3 py-2" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Priority</label>
            <select className="w-full border rounded-md px-3 py-2" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">ID / Subject</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Requester</th>
              <th className="px-lg py-sm text-left text-xs font-bold text-on-surface-variant uppercase">Assignee</th>
              <th className="px-lg py-sm text-center text-xs font-bold text-on-surface-variant uppercase">Status</th>
              <th className="px-lg py-sm text-right text-xs font-bold text-on-surface-variant uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {tickets.length === 0 ? (
              <tr><td colSpan="5" className="px-lg py-xl text-center text-on-surface-variant">No tickets found.</td></tr>
            ) : tickets.map(ticket => (
              <tr 
                key={ticket.id} 
                onClick={() => onSelectTicket(ticket.id)}
                className="hover:bg-surface-container/50 cursor-pointer transition-colors"
              >
                <td className="px-lg py-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">#{ticket.id.split('-')[0]}</span>
                    {ticket.priority === 'urgent' && <span className="material-symbols-outlined text-[14px] text-error">warning</span>}
                  </div>
                  <div className="font-title-sm font-bold text-on-surface">{ticket.title}</div>
                  <div className="text-xs text-on-surface-variant mt-1">{ticket.category}</div>
                </td>
                <td className="px-lg py-md text-sm text-on-surface">
                  {ticket.requester ? `${ticket.requester.first_name} ${ticket.requester.last_name}` : 'Unknown'}
                </td>
                <td className="px-lg py-md text-sm text-on-surface-variant">
                  {ticket.assignee ? `${ticket.assignee.first_name} ${ticket.assignee.last_name}` : <span className="italic opacity-50">Unassigned</span>}
                </td>
                <td className="px-lg py-md text-center">
                  {getStatusBadge(ticket.status)}
                </td>
                <td className="px-lg py-md text-sm text-right text-on-surface-variant whitespace-nowrap">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
