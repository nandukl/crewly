import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { rbacService } from '../../lib/rbacService';
import { AttendanceDashboard } from './AttendanceDashboard';
import { AttendanceHistory } from './AttendanceHistory';
import { CorrectionRequests } from './CorrectionRequests';
import { TeamAttendance } from './TeamAttendance';
import { AttendanceSettings } from './AttendanceSettings';

export const AttendanceContainer = () => {
  const { activeOrganization } = useOrg();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [permissions, setPermissions] = useState({
    viewTeam: false,
    manageCorrections: false,
    managePolicies: false
  });

  useEffect(() => {
    if (activeOrganization?.id) {
      const checkPermissions = async () => {
        const viewTeam = await rbacService.can(activeOrganization.id, 'view', 'attendance_records');
        const manageCorrections = await rbacService.can(activeOrganization.id, 'approve', 'attendance_corrections');
        const managePolicies = await rbacService.can(activeOrganization.id, 'edit', 'attendance_policies');
        
        setPermissions({ viewTeam, manageCorrections, managePolicies });
      };
      checkPermissions();
    }
  }, [activeOrganization?.id]);

  const tabs = [
    { id: 'dashboard', label: 'My Dashboard' },
    { id: 'history', label: 'My History' },
    ...(permissions.viewTeam ? [{ id: 'team', label: 'Team Attendance' }] : []),
    ...(permissions.manageCorrections ? [{ id: 'corrections', label: 'Corrections' }] : []),
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
        {activeTab === 'dashboard' && <AttendanceDashboard />}
        {activeTab === 'history' && <AttendanceHistory />}
        {activeTab === 'team' && <TeamAttendance />}
        {activeTab === 'corrections' && <CorrectionRequests />}
        {activeTab === 'settings' && <AttendanceSettings />}
      </div>
    </div>
  );
};
