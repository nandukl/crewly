import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { rbacService } from '../../lib/rbacService';
import { MyLeaves } from './MyLeaves';
import { LeaveApprovals } from './LeaveApprovals';
import { LeaveCalendar } from './LeaveCalendar';
import { LeaveSettings } from './LeaveSettings';

export const LeaveContainer = () => {
  const { activeOrganization } = useOrg();
  const [activeTab, setActiveTab] = useState('myleaves');
  const [permissions, setPermissions] = useState({
    viewTeam: false,
    manageApprovals: false,
    managePolicies: false
  });

  useEffect(() => {
    if (activeOrganization?.id) {
      const checkPermissions = async () => {
        const viewTeam = await rbacService.can(activeOrganization.id, 'view', 'leave_requests');
        const manageApprovals = await rbacService.can(activeOrganization.id, 'approve', 'leave_requests');
        const managePolicies = await rbacService.can(activeOrganization.id, 'edit', 'leave_types');
        
        setPermissions({ viewTeam, manageApprovals, managePolicies });
      };
      checkPermissions();
    }
  }, [activeOrganization?.id]);

  const tabs = [
    { id: 'myleaves', label: 'My Leaves' },
    ...(permissions.viewTeam ? [{ id: 'calendar', label: 'Leave Calendar' }] : []),
    ...(permissions.manageApprovals ? [{ id: 'approvals', label: 'Approvals' }] : []),
    ...(permissions.managePolicies ? [{ id: 'settings', label: 'Settings' }] : [])
  ];

  return (
    <div className="bg-white shadow rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 px-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="p-6">
        {activeTab === 'myleaves' && <MyLeaves />}
        {activeTab === 'calendar' && <LeaveCalendar />}
        {activeTab === 'approvals' && <LeaveApprovals />}
        {activeTab === 'settings' && <LeaveSettings />}
      </div>
    </div>
  );
};
