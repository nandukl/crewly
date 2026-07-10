import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrg } from '../org/OrgContext';
import { Button } from '../../components/ui/Button';

export const TicketThread = ({ ticketId, onBack, isAdmin, currentUserId }) => {
  const { activeOrganization } = useOrg();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // For admin assignments
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (activeOrganization && ticketId) {
      fetchData();
    }
  }, [activeOrganization, ticketId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Ticket
    const { data: tData } = await supabase
      .from('hd_tickets')
      .select('*, requester:requester_id(first_name, last_name), assignee:assignee_id(first_name, last_name)')
      .eq('id', ticketId)
      .single();
    setTicket(tData);

    // Fetch Messages
    const { data: mData } = await supabase
      .from('hd_ticket_messages')
      .select('*, sender:sender_id(first_name, last_name, avatar_url)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages(mData || []);

    // If admin, fetch users for assignment
    if (isAdmin) {
      const { data: uData } = await supabase
        .from('memberships')
        .select('user_id, user_profiles(first_name, last_name)')
        .eq('organization_id', activeOrganization.id)
        .eq('status', 'active');
      if (uData) setUsers(uData.map(u => ({ id: u.user_id, name: u.user_profiles ? `${u.user_profiles.first_name} ${u.user_profiles.last_name}` : 'Unknown' })));
    }

    setLoading(false);
  };

  const handleUpdateStatus = async (newStatus) => {
    const { error } = await supabase.from('hd_tickets').update({ status: newStatus }).eq('id', ticketId);
    if (!error) setTicket({ ...ticket, status: newStatus });
  };

  const handleUpdateAssignee = async (newAssigneeId) => {
    const val = newAssigneeId || null;
    const { error } = await supabase.from('hd_tickets').update({ assignee_id: val }).eq('id', ticketId);
    if (!error) {
      const assigneeObj = val ? users.find(u => u.id === val) : null;
      setTicket({ 
        ...ticket, 
        assignee_id: val, 
        assignee: assigneeObj ? { first_name: assigneeObj.name.split(' ')[0], last_name: assigneeObj.name.split(' ')[1] } : null 
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from('hd_ticket_messages')
      .insert({
        organization_id: activeOrganization.id,
        ticket_id: ticketId,
        sender_id: currentUserId,
        message: newMessage.trim(),
        is_internal_note: isAdmin ? isInternal : false
      });

    if (!error) {
      setNewMessage('');
      setIsInternal(false);
      fetchData(); // refresh messages
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      open: 'bg-error-container text-error border-error/20',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      waiting_on_user: 'bg-amber-100 text-amber-800 border-amber-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || 'bg-gray-100'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) return <div className="p-xl animate-pulse">Loading ticket thread...</div>;
  if (!ticket) return <div className="p-xl text-error">Ticket not found or access denied.</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-lowest overflow-hidden">
      {/* Header */}
      <div className="px-xl py-md border-b border-outline-variant bg-surface flex justify-between items-start sticky top-0 z-10">
        <div className="flex gap-md">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors self-start mt-1">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">#{ticket.id.split('-')[0]}</span>
              {getStatusBadge(ticket.status)}
              {ticket.priority === 'urgent' && <span className="text-[10px] uppercase font-bold text-error border border-error px-1.5 py-0.5 rounded-full bg-error-container/30">Urgent</span>}
            </div>
            <h2 className="font-title-lg text-title-lg text-on-surface mt-1">{ticket.title}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Thread Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-outline-variant">
          
          <div className="flex-1 overflow-y-auto p-xl space-y-xl bg-surface">
            {/* Original Request */}
            <div className="flex gap-md">
              <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                {ticket.requester?.first_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-tl-sm p-lg shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-sm text-on-surface">{ticket.requester?.first_name} {ticket.requester?.last_name}</div>
                  <div className="text-xs text-on-surface-variant">{new Date(ticket.created_at).toLocaleString()}</div>
                </div>
                <div className="text-body-md text-on-surface whitespace-pre-wrap">{ticket.description}</div>
              </div>
            </div>

            {/* Replies */}
            {messages.map(msg => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex gap-md ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    msg.is_internal_note ? 'bg-amber-100 text-amber-800' : 'bg-surface-container-high text-on-surface'
                  }`}>
                    {msg.sender?.first_name?.charAt(0) || '?'}
                  </div>
                  
                  <div className={`max-w-[80%] rounded-2xl p-lg shadow-sm ${
                    msg.is_internal_note ? 'bg-amber-50 border border-amber-200' : 
                    isMe ? 'bg-primary-container text-on-primary-container rounded-tr-sm' : 
                    'bg-surface-container-lowest border border-outline-variant rounded-tl-sm'
                  }`}>
                    <div className="flex justify-between items-start gap-xl mb-1">
                      <div className="font-bold text-sm">
                        {msg.sender?.first_name} {msg.sender?.last_name}
                        {msg.is_internal_note && <span className="ml-2 text-[10px] uppercase font-bold text-amber-700 bg-amber-200/50 px-1.5 py-0.5 rounded">Internal Note</span>}
                      </div>
                      <div className="text-xs opacity-70">{new Date(msg.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-body-md whitespace-pre-wrap">{msg.message}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Box */}
          <div className="p-md bg-surface-container border-t border-outline-variant">
            <form onSubmit={handleSendMessage} className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
              <textarea 
                className="w-full bg-transparent border-none p-md resize-none focus:ring-0 text-on-surface"
                rows="3"
                placeholder={isInternal ? "Type an internal note (only visible to admins)..." : "Type your reply..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <div className="bg-surface-container-low px-md py-sm flex justify-between items-center border-t border-outline-variant">
                <div>
                  {isAdmin && (
                    <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded text-amber-600 focus:ring-amber-600" />
                      Add as Internal Note
                    </label>
                  )}
                </div>
                <Button type="submit" disabled={!newMessage.trim()}>Send Reply</Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Meta */}
        <div className="w-full md:w-80 bg-surface-container-lowest p-lg space-y-lg overflow-y-auto">
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Requester</h4>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-sm">
                {ticket.requester?.first_name?.charAt(0)}
              </div>
              <div className="text-sm font-medium text-on-surface">
                {ticket.requester?.first_name} {ticket.requester?.last_name}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Category</h4>
            <div className="text-sm text-on-surface">{ticket.category}</div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Priority</h4>
            <div className="text-sm capitalize text-on-surface">{ticket.priority}</div>
          </div>

          <div className="pt-lg border-t border-outline-variant space-y-md">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">Status</label>
              <select 
                value={ticket.status} 
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={!isAdmin && ticket.requester_id !== currentUserId}
                className="w-full border-outline-variant rounded-md text-sm bg-surface p-2 border"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_user">Waiting on User</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {isAdmin && (
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">Assignee</label>
                <select 
                  value={ticket.assignee_id || ''} 
                  onChange={(e) => handleUpdateAssignee(e.target.value)}
                  className="w-full border-outline-variant rounded-md text-sm bg-surface p-2 border"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            
            {!isAdmin && (
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">Assignee</label>
                <div className="text-sm text-on-surface">
                  {ticket.assignee ? `${ticket.assignee.first_name} ${ticket.assignee.last_name}` : 'Unassigned'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
