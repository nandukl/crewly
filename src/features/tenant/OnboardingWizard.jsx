import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../org/OrgContext';
import { orgService } from '../../lib/orgService';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';

const AVAILABLE_MODULES = [
  { id: 'attendance', name: 'Attendance', icon: 'event_available', desc: 'Track clock-ins, timesheets, and presence.' },
  { id: 'leave', name: 'Leave Management', icon: 'event_busy', desc: 'Manage time off requests, policies, and balances.' },
  { id: 'payroll', name: 'Payroll', icon: 'payments', desc: 'Run compensation cycles and generate payslips.' },
  { id: 'performance', name: 'Performance', icon: 'trending_up', desc: 'Manage goals, 1-on-1s, and review cycles.' },
  { id: 'crm', name: 'CRM', icon: 'handshake', desc: 'Track leads, accounts, contacts, and deal pipelines.' },
  { id: 'projects', name: 'Projects', icon: 'account_tree', desc: 'Manage tasks, milestones, and project delivery.' },
  { id: 'helpdesk', name: 'Help Desk', icon: 'support_agent', desc: 'Internal or external support ticketing.' },
  { id: 'inventory', name: 'Inventory', icon: 'inventory_2', desc: 'Track items, stock levels, and warehouse locations.' },
  { id: 'finance', name: 'Finance & Expenses', icon: 'account_balance', desc: 'Manage AR, AP, and the General Ledger.' },
];

export const OnboardingWizard = () => {
  const { activeOrganization, refreshOrganizations, refreshModules } = useOrg();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [invites, setInvites] = useState([{ email: '', role: 'employee' }]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const toggleModule = (id) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleInviteChange = (index, field, value) => {
    const newInvites = [...invites];
    newInvites[index][field] = value;
    setInvites(newInvites);
  };

  const addInviteRow = () => setInvites([...invites, { email: '', role: 'employee' }]);
  const removeInviteRow = (index) => setInvites(invites.filter((_, i) => i !== index));

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Activate selected modules
      if (selectedModules.length > 0) {
        const activations = selectedModules.map(modId => ({
          organization_id: activeOrganization.id,
          module_key: modId,
          is_active: true
        }));
        await supabase.from('org_module_activations').upsert(activations);
        await refreshModules();
      }

      // 2. Send invites
      const validInvites = invites.filter(inv => inv.email.trim());
      for (const invite of validInvites) {
        try {
          await orgService.inviteMember(activeOrganization.id, invite.email.trim(), invite.role);
        } catch (err) {
          console.error(`Failed to invite ${invite.email}`, err);
        }
      }

      // 3. Mark onboarding complete
      await orgService.completeOnboarding(activeOrganization.id);
      await refreshOrganizations();
      
      // The OrgContext will update and App.jsx routing will see onboarding_completed=true
      // But we can also force navigate
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error("Failed to finish onboarding", err);
      alert("Failed to complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-body-md text-on-surface">
      
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-headline-lg text-3xl font-bold text-primary">Welcome to {activeOrganization?.name}!</h1>
          <span className="text-sm text-on-surface-variant font-medium">Step {step} of 3</span>
        </div>

        <div className="bg-white shadow-sm border border-outline-variant rounded-2xl p-8">
          
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Confirm your details</h2>
              <p className="text-on-surface-variant">Before we jump in, let's make sure everything looks right.</p>
              
              <div className="grid grid-cols-2 gap-6 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
                <div>
                  <p className="text-sm font-bold text-on-surface-variant mb-1">Organization Name</p>
                  <p className="text-lg">{activeOrganization?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface-variant mb-1">Workspace URL</p>
                  <p className="text-lg">{activeOrganization?.slug}.crewly.com</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface-variant mb-1">Industry</p>
                  <p className="text-lg">{activeOrganization?.industry || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface-variant mb-1">Company Size</p>
                  <p className="text-lg">{activeOrganization?.size || 'Not specified'}</p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button onClick={handleNext}>Looks Good &rarr;</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Choose your starter modules</h2>
              <p className="text-on-surface-variant">Select the tools you'd like to test out during your trial. You can change this at any time in the Marketplace.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {AVAILABLE_MODULES.map(mod => {
                  const isSelected = selectedModules.includes(mod.id);
                  return (
                    <div 
                      key={mod.id} 
                      onClick={() => toggleModule(mod.id)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-start ${isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-outline'}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isSelected ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[24px]">{mod.icon}</span>
                      </div>
                      <h3 className="font-bold text-base mb-1">{mod.name}</h3>
                      <p className="text-sm text-on-surface-variant line-clamp-2 leading-tight">{mod.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={handleBack}>&larr; Back</Button>
                <div className="space-x-3">
                  <Button variant="secondary" onClick={handleNext}>Skip</Button>
                  <Button onClick={handleNext}>Continue</Button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Invite your team</h2>
              <p className="text-on-surface-variant">Bring your first few team members on board. You can also skip this and do it later from the Employee Directory.</p>
              
              <div className="space-y-4">
                {invites.map((invite, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <input
                      type="email"
                      placeholder="colleague@example.com"
                      value={invite.email}
                      onChange={(e) => handleInviteChange(index, 'email', e.target.value)}
                      className="flex-1 px-4 py-2 border border-outline rounded-lg focus:outline-none focus:border-primary"
                    />
                    <select
                      value={invite.role}
                      onChange={(e) => handleInviteChange(index, 'role', e.target.value)}
                      className="px-4 py-2 border border-outline rounded-lg focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="org_admin">Admin</option>
                    </select>
                    {invites.length > 1 && (
                      <button onClick={() => removeInviteRow(index)} className="p-2 text-error hover:bg-error/10 rounded-full">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    )}
                  </div>
                ))}
                
                <button onClick={addInviteRow} className="flex items-center gap-2 text-primary font-medium hover:underline text-sm mt-2">
                  <span className="material-symbols-outlined text-[18px]">add</span> Add another
                </button>
              </div>

              <div className="pt-8 flex justify-between items-center border-t border-outline-variant">
                <Button variant="outline" onClick={handleBack}>&larr; Back</Button>
                <div className="space-x-3">
                  {invites.every(inv => !inv.email.trim()) && (
                    <Button variant="ghost" onClick={handleFinish} isLoading={loading}>
                      Skip for now
                    </Button>
                  )}
                  <Button isLoading={loading} onClick={handleFinish}>
                    {invites.some(inv => inv.email.trim()) ? 'Send Invites & Finish' : 'Finish Setup'}
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
