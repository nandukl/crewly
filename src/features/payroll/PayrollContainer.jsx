import React, { useState, useEffect } from 'react';
import { PayrollDashboard } from './PayrollDashboard';
import { SalaryStructures } from './SalaryStructures';
import { RunPayroll } from './RunPayroll';
import { MyPayslips } from './MyPayslips';
import { rbacService } from '../../lib/rbacService';
import { supabase } from '../../lib/supabaseClient';

export const PayrollContainer = ({ activeOrganization }) => {
  const [userId, setUserId] = useState(null);
  const [canManagePayroll, setCanManagePayroll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUserId(userData.user.id);
      }
      if (activeOrganization?.id) {
        const manage = await rbacService.can(activeOrganization.id, 'manage', 'payroll_runs');
        setCanManagePayroll(manage);
      }
      setLoading(false);
    };
    init();
  }, [activeOrganization?.id]);

  if (loading) return null;

  // Employee-only view if they don't have manage rights
  if (!canManagePayroll) {
    return (
      <div className="p-xl max-w-container-max mx-auto">
        <MyPayslips employeeId={userId} />
      </div>
    );
  }

  // Admin view
  return (
    <div className="p-xl max-w-container-max mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Payroll Management</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage compensation bands and process monthly payroll.</p>
        </div>
      </div>

      <div className="flex border-b border-outline-variant mb-xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-lg py-sm font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('structures')}
          className={`px-lg py-sm font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'structures' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Compensation Bands
        </button>
        <button
          onClick={() => setActiveTab('run')}
          className={`px-lg py-sm font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'run' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Process Payroll
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'dashboard' && <PayrollDashboard activeOrganization={activeOrganization} />}
        {activeTab === 'structures' && <SalaryStructures activeOrganization={activeOrganization} />}
        {activeTab === 'run' && <RunPayroll activeOrganization={activeOrganization} />}
      </div>
    </div>
  );
};
