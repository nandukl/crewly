import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../org/OrgContext';
import { orgService } from '../../lib/orgService';
import { supabase } from '../../lib/supabaseClient';
import { ModulePanel } from '../../components/ui/ModulePanel';
import { AISetupAssistant } from './AISetupAssistant';

const AVAILABLE_MODULES = [
  { id: 'hr', name: 'HR & directory', icon: 'groups', desc: 'Centralized employee directory, org charts, and core records.' },
  { id: 'attendance', name: 'Attendance', icon: 'schedule', desc: 'Track clock-ins, timesheets, and presence.' },
  { id: 'leave', name: 'Leave management', icon: 'event_available', desc: 'Manage time off requests, policies, and balances.' },
  { id: 'payroll', name: 'Payroll', icon: 'payments', desc: 'Run compensation cycles and generate payslips.' },
  { id: 'performance', name: 'Performance', icon: 'trending_up', desc: 'Manage goals, 1-on-1s, and review cycles.' },
  { id: 'crm', name: 'CRM', icon: 'handshake', desc: 'Track leads, accounts, contacts, and deal pipelines.' },
  { id: 'projects', name: 'Projects', icon: 'account_tree', desc: 'Manage tasks, milestones, and project delivery.' },
  { id: 'helpdesk', name: 'Help desk', icon: 'support_agent', desc: 'Internal or external support ticketing.' },
  { id: 'inventory', name: 'Inventory', icon: 'inventory_2', desc: 'Track items, stock levels, and warehouse locations.' },
  { id: 'finance', name: 'Finance & expenses', icon: 'account_balance', desc: 'Manage AR, AP, and the General Ledger.' }
];

export const OnboardingWizard = () => {
  const { activeOrganization, refreshOrganizations, refreshModules } = useOrg();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [transitioningMod, setTransitioningMod] = useState(null);
  const [invites, setInvites] = useState([{ email: '', role: 'employee' }]);
  const [departments, setDepartments] = useState(['Engineering', 'Sales', 'HR']);
  const [draftData, setDraftData] = useState(null);

  const handleNext = () => setStep(s => s + 1);

  const toggleModule = (id) => {
    setTransitioningMod(id);
    setTimeout(() => {
      setSelectedModules(prev => 
        prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
      );
      setTransitioningMod(null);
    }, 150);
  };

  const handleInviteChange = (index, field, value) => {
    const newInvites = [...invites];
    newInvites[index][field] = value;
    setInvites(newInvites);
  };

  const addInviteRow = () => setInvites([...invites, { email: '', role: 'employee' }]);

  const handleFinish = async () => {
    setLoading(true);
    try {
      if (selectedModules.length > 0) {
        const activations = selectedModules.map(modId => ({
          organization_id: activeOrganization.id,
          module_key: modId,
          is_active: true
        }));
        await supabase.from('org_module_activations').upsert(activations);
        await refreshModules();
      }

      if (draftData) {
        if (draftData.suggested_leave_types?.length > 0) {
          const leaveTypes = draftData.suggested_leave_types.map(lt => ({
            organization_id: activeOrganization.id,
            name: lt.name,
            description: lt.description || '',
            days_allowed: 10,
            requires_approval: true
          }));
          await supabase.from('leave_types').insert(leaveTypes);
        }
        
        if (draftData.suggested_salary_components?.length > 0) {
          const salaryComps = draftData.suggested_salary_components.map(sc => ({
            organization_id: activeOrganization.id,
            name: sc.name,
            type: sc.type,
            default_value: 0
          }));
          await supabase.from('salary_components').insert(salaryComps);
        }
      }

      const validInvites = invites.filter(inv => inv.email.trim());
      for (const invite of validInvites) {
        try {
          await orgService.inviteMember(activeOrganization.id, invite.email.trim(), invite.role);
        } catch (err) {
          console.error(`Failed to invite ${invite.email}`, err);
        }
      }

      await orgService.completeOnboarding(activeOrganization.id);
      await refreshOrganizations();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error("Failed to finish onboarding", err);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Org basics', 'AI Assistant', 'Structure', 'Modules', 'Invite team', 'Done'];

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row font-body-md text-on-surface selection:bg-on-surface-variant/30">
      
      {/* Persistent Left-Hand Step Rail */}
      <aside className="w-full md:w-64 bg-primary-container border-r border-outline-variant p-8 flex flex-col">
        <div className="mb-12 font-display-md text-white text-xl tracking-tight font-bold">Crewly</div>
        <nav className="flex flex-col gap-6">
          {stepLabels.map((label, idx) => {
            const num = idx + 1;
            const isActive = step === num;
            const isPast = step > num;
            return (
              <div key={num} className={`flex items-center gap-4 ${isActive ? 'text-[#E8A23C]' : isPast ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
                <div className={`font-mono text-sm ${isActive ? 'opacity-100' : 'opacity-0'}`}>&gt;</div>
                <div className="font-medium text-sm flex items-center gap-2">
                  <span className="font-mono text-xs">{num}</span>
                  {label}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-16 overflow-y-auto bg-surface-container-lowest">
        <div className="max-w-4xl mx-auto">
          
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="text-3xl font-display-md text-on-surface mb-2 font-bold">Organization basics</h1>
                <p className="text-on-surface-variant font-body-md">Confirm your organization details.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-container border border-outline-variant p-6 rounded-sm">
                  <p className="font-medium text-on-surface-variant mb-2 text-sm">Workspace Name</p>
                  <p className="text-lg font-body-md text-on-surface font-medium">{activeOrganization?.name}</p>
                </div>
                <div className="bg-surface-container border border-outline-variant p-6 rounded-sm">
                  <p className="font-medium text-on-surface-variant mb-2 text-sm">Subdomain</p>
                  <p className="text-lg font-mono text-[#2F9E8F]">{activeOrganization?.slug}.crewly.com</p>
                </div>
              </div>
              
              <div className="pt-8 border-t border-outline-variant flex items-center justify-between">
                <div></div>
                <button 
                  onClick={handleNext}
                  className="bg-[#E8A23C] hover:bg-[#d69536] text-primary-container px-6 py-3 font-medium rounded-sm transition-colors text-base shadow-sm"
                >
                  Proceed
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <AISetupAssistant 
              onSkip={handleNext}
              onApplyDraft={(draft) => {
                // Pre-fill Modules
                if (draft.recommended_modules?.length > 0) {
                  const draftMods = draft.recommended_modules.map(modName => {
                    const found = AVAILABLE_MODULES.find(m => modName.toLowerCase().includes(m.id) || m.name.toLowerCase().includes(modName.toLowerCase()));
                    return found ? found.id : null;
                  }).filter(Boolean);
                  setSelectedModules(prev => [...new Set([...prev, ...draftMods])]);
                }

                // Pre-fill Departments
                if (draft.suggested_departments?.length > 0) {
                  setDepartments(prev => [...new Set([...prev, ...draft.suggested_departments.filter(d => d && d !== 'None new')])].filter(d => d !== ''));
                }

                // Store complex draft items to be saved on finish
                setDraftData(draft);
                handleNext();
              }}
            />
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="text-3xl font-display-md text-on-surface mb-2 font-bold">Define structure</h1>
                <p className="text-on-surface-variant font-body-md">Set up your departments.</p>
              </div>
              
              <div className="space-y-4">
                {departments.map((dept, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-surface-container border border-outline-variant p-4 rounded-sm">
                    <span className="material-symbols-outlined text-on-surface-variant">account_tree</span>
                    <input 
                      type="text" 
                      value={dept}
                      onChange={(e) => {
                        const newD = [...departments];
                        newD[idx] = e.target.value;
                        setDepartments(newD);
                      }}
                      className="bg-transparent border-none focus:outline-none focus:ring-0 font-body-md text-on-surface w-full"
                    />
                  </div>
                ))}
                <button 
                  onClick={() => setDepartments([...departments, ''])}
                  className="flex items-center gap-2 text-[#2F9E8F] font-medium text-sm hover:text-[#248174]"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Add department
                </button>
              </div>

              <div className="pt-8 border-t border-outline-variant flex items-center justify-between">
                <button onClick={handleNext} className="text-on-surface-variant hover:text-on-surface font-medium text-sm transition-colors">
                  Skip for now
                </button>
                <button 
                  onClick={handleNext}
                  className="bg-[#E8A23C] hover:bg-[#d69536] text-primary-container px-6 py-3 font-medium rounded-sm transition-colors text-base shadow-sm"
                >
                  Proceed
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="text-3xl font-display-md text-on-surface mb-2 font-bold">Choose starter modules</h1>
                <p className="text-on-surface-variant font-body-md">Turn on the modules you need.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {AVAILABLE_MODULES.map(mod => (
                  <ModulePanel
                    key={mod.id}
                    title={mod.name}
                    description={mod.desc}
                    icon={mod.icon}
                    status={selectedModules.includes(mod.id) ? 'active' : 'inactive'}
                    interactive={true}
                    onToggle={() => toggleModule(mod.id)}
                    isTransitioning={transitioningMod === mod.id}
                  />
                ))}
              </div>

              <div className="pt-8 border-t border-outline-variant flex items-center justify-between">
                <button onClick={handleNext} className="text-on-surface-variant hover:text-on-surface font-medium text-sm transition-colors">
                  Skip for now
                </button>
                <button 
                  onClick={handleNext}
                  className="bg-[#E8A23C] hover:bg-[#d69536] text-primary-container px-6 py-3 font-medium rounded-sm transition-colors text-base shadow-sm"
                >
                  Proceed
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="text-3xl font-display-md text-on-surface mb-2 font-bold">Invite your team</h1>
                <p className="text-on-surface-variant font-body-md">Add your first employees.</p>
              </div>
              
              <div className="space-y-4">
                {invites.map((invite, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={invite.email}
                      onChange={(e) => handleInviteChange(index, 'email', e.target.value)}
                      className="flex-1 bg-surface-container border border-outline-variant p-4 rounded-sm font-body-md focus:outline-none focus:border-[#E8A23C] transition-colors"
                    />
                    <select
                      value={invite.role}
                      onChange={(e) => handleInviteChange(index, 'role', e.target.value)}
                      className="w-full sm:w-48 bg-surface-container border border-outline-variant p-4 rounded-sm font-medium text-sm focus:outline-none focus:border-[#E8A23C] transition-colors appearance-none text-on-surface"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="org_admin">Admin</option>
                    </select>
                  </div>
                ))}
                
                <button onClick={addInviteRow} className="flex items-center gap-2 text-[#2F9E8F] font-medium text-sm hover:text-[#248174]">
                  <span className="material-symbols-outlined text-sm">add</span> Add row
                </button>
              </div>

              <div className="pt-8 border-t border-outline-variant flex items-center justify-between">
                <button onClick={handleNext} className="text-on-surface-variant hover:text-on-surface font-medium text-sm transition-colors">
                  Skip for now
                </button>
                <button 
                  onClick={handleNext}
                  className="bg-[#E8A23C] hover:bg-[#d69536] text-primary-container px-6 py-3 font-medium rounded-sm transition-colors text-base shadow-sm"
                >
                  Proceed
                </button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="text-3xl font-display-md text-on-surface mb-2 font-bold">Your workspace is ready</h1>
                <p className="text-on-surface-variant font-body-md">You will now be redirected to the command center.</p>
              </div>
              
              <div className="bg-surface-container border border-outline-variant p-8 rounded-sm flex flex-col items-center justify-center py-16">
                 <div className="w-16 h-16 bg-[#2F9E8F]/20 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl text-[#2F9E8F]">check</span>
                 </div>
                 <p className="font-body-md text-on-surface">Setup complete.</p>
              </div>

              <div className="pt-8 border-t border-outline-variant flex items-center justify-between">
                <div></div>
                <button 
                  onClick={handleFinish}
                  disabled={loading}
                  className="bg-[#E8A23C] hover:bg-[#d69536] text-primary-container px-6 py-3 font-medium rounded-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Entering...' : 'Enter workspace'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
