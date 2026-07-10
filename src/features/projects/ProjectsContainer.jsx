import React, { useState } from 'react';
import { useOrg } from '../org/OrgContext';
import { ProjectsDashboard } from './ProjectsDashboard';
import { ProjectsList } from './ProjectsList';
import { MyTasks } from './MyTasks';

import { ProjectDetails } from './ProjectDetails';

export const ProjectsContainer = () => {
  const { activeOrganization, currentMembership } = useOrg();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  if (!activeOrganization) return null;

  // If a project is selected, show the deep view
  if (selectedProjectId) {
    return (
      <div className="h-full bg-surface flex flex-col">
        <ProjectDetails 
          projectId={selectedProjectId} 
          onBack={() => setSelectedProjectId(null)} 
        />
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'list', label: 'All Projects' },
    { id: 'mytasks', label: 'My Tasks' }
  ];

  return (
    <div className="h-full bg-surface">
      <div className="px-xl pt-xl border-b border-outline-variant">
        <div className="flex items-center gap-sm mb-lg">
          <span className="material-symbols-outlined text-[32px] text-primary">account_tree</span>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Projects & Tasks</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage your organization's work and deliverables.</p>
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
        {activeTab === 'dashboard' && <ProjectsDashboard />}
        {activeTab === 'list' && <ProjectsList onSelectProject={setSelectedProjectId} />}
        {activeTab === 'mytasks' && <MyTasks />}
      </div>
    </div>
  );
};
