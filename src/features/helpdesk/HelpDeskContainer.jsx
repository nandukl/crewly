import React, { useState } from 'react';
import { useOrg } from '../org/OrgContext';
import { HelpDeskDashboard } from './HelpDeskDashboard';
import { TicketList } from './TicketList';
import { TicketThread } from './TicketThread';

export const HelpDeskContainer = () => {
  const { activeOrganization, currentMembership } = useOrg();
  
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'mytickets');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  if (!activeOrganization) return null;

  // Deep view for a specific ticket
  if (selectedTicketId) {
    return (
      <div className="h-full bg-surface flex flex-col">
        <TicketThread 
          ticketId={selectedTicketId} 
          onBack={() => setSelectedTicketId(null)} 
          isAdmin={isAdmin}
          currentUserId={currentMembership.user_id}
        />
      </div>
    );
  }

  const tabs = [
    ...(isAdmin ? [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'queue', label: 'Ticket Queue' }
    ] : []),
    { id: 'mytickets', label: 'My Requests' }
  ];

  return (
    <div className="h-full bg-surface">
      <div className="px-xl pt-xl border-b border-outline-variant">
        <div className="flex items-center gap-sm mb-lg">
          <span className="material-symbols-outlined text-[32px] text-primary">support_agent</span>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Help Desk</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Internal support and ticketing system.</p>
          </div>
        </div>

        <div className="flex gap-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-lg py-sm font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-xl">
        {activeTab === 'dashboard' && <HelpDeskDashboard />}
        {activeTab === 'queue' && <TicketList view="queue" onSelectTicket={setSelectedTicketId} isAdmin={isAdmin} />}
        {activeTab === 'mytickets' && <TicketList view="mine" onSelectTicket={setSelectedTicketId} isAdmin={isAdmin} currentUserId={currentMembership.user_id} />}
      </div>
    </div>
  );
};
