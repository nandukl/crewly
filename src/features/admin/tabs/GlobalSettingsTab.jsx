import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';

export const GlobalSettingsTab = () => {
  const [allowOpenSignups, setAllowOpenSignups] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [globalAnnouncement, setGlobalAnnouncement] = useState('');
  
  const handleSave = () => {
    // In a real implementation, this would save to a platform_settings table
    alert('Settings saved successfully (Mock implementation)');
  };

  return (
    <div className="bg-surface-container-lowest shadow-sm rounded-xl overflow-hidden border border-outline-variant max-w-4xl">
      <div className="px-xl py-lg border-b border-outline-variant bg-surface-container">
        <h3 className="font-title-lg text-title-lg text-on-surface">Platform Global Settings</h3>
        <p className="text-sm text-on-surface-variant mt-1">Configure global toggles and platform-wide configurations.</p>
      </div>
      
      <div className="p-xl space-y-xl">
        {/* Toggle Settings */}
        <div className="space-y-md">
          <h4 className="font-title-md font-bold text-on-surface">Access Controls</h4>
          
          <div className="flex items-center justify-between p-md border border-outline-variant rounded-lg bg-surface-container">
            <div>
              <p className="font-medium text-on-surface">Allow Open Signups</p>
              <p className="text-sm text-on-surface-variant">When disabled, new users can only join via invite.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={allowOpenSignups} onChange={(e) => setAllowOpenSignups(e.target.checked)} />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-md border border-outline-variant rounded-lg bg-surface-container">
            <div>
              <p className="font-medium text-on-surface">Maintenance Mode</p>
              <p className="text-sm text-on-surface-variant">When enabled, the application will display a maintenance page to all non-superadmin users.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
            </label>
          </div>
        </div>

        {/* Global Announcement */}
        <div className="space-y-md">
          <h4 className="font-title-md font-bold text-on-surface">Global Banner Announcement</h4>
          <div className="space-y-sm">
            <label className="text-sm text-on-surface-variant">Message to display at the top of all user dashboards (leave blank to disable)</label>
            <textarea 
              rows={3} 
              className="w-full px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest focus-ring text-on-surface font-body-md resize-none"
              placeholder="e.g., Scheduled maintenance will occur on Saturday at 2AM UTC."
              value={globalAnnouncement}
              onChange={(e) => setGlobalAnnouncement(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="px-xl py-lg border-t border-outline-variant bg-surface-container flex justify-end">
        <Button onClick={handleSave}>Save Platform Settings</Button>
      </div>
    </div>
  );
};
