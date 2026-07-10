import React, { useState } from 'react';
import { useOrg } from '../org/OrgContext';
import { PerformanceDashboard } from './PerformanceDashboard';
import { MyReviews } from './MyReviews';
import { TeamReviews } from './TeamReviews';

export const PerformanceContainer = () => {
  const { currentMembership } = useOrg();
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'org_admin';
  const isManager = true; // In a real app, we might check if they have reports. Let's just assume everyone can see the tab, or we can check later. We'll show it for everyone for now.

  const [activeSubTab, setActiveSubTab] = useState(isAdmin ? 'dashboard' : 'my-reviews');

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="mb-lg border-b border-outline-variant">
        <h1 className="font-display-sm text-display-sm text-on-surface mb-sm">Performance Reviews</h1>
        
        <div className="flex space-x-md">
          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`pb-sm font-label-lg transition-colors ${
                activeSubTab === 'dashboard'
                  ? 'text-primary border-b-2 border-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Review Cycles
            </button>
          )}
          
          <button
            onClick={() => setActiveSubTab('my-reviews')}
            className={`pb-sm font-label-lg transition-colors ${
              activeSubTab === 'my-reviews'
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            My Reviews
          </button>

          <button
            onClick={() => setActiveSubTab('team-reviews')}
            className={`pb-sm font-label-lg transition-colors ${
              activeSubTab === 'team-reviews'
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Team Reviews
          </button>
        </div>
      </div>

      <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
        {activeSubTab === 'dashboard' && <PerformanceDashboard />}
        {activeSubTab === 'my-reviews' && <MyReviews />}
        {activeSubTab === 'team-reviews' && <TeamReviews />}
      </div>
    </div>
  );
};
