import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModulePanel } from '../../components/ui/ModulePanel';

const modules = [
  { id: 'hr', icon: 'groups', title: 'HR & Directory', desc: 'Centralized employee directory, org charts, and core records.' },
  { id: 'attendance', icon: 'schedule', title: 'Attendance', desc: 'Clock in/out tracking, timesheets, and correction workflows.' },
  { id: 'leave', icon: 'event_available', title: 'Leave Management', desc: 'Custom policies, balance tracking, and approval chains.' },
  { id: 'payroll', icon: 'payments', title: 'Global Payroll', desc: 'Automated salary structures, deductions, and secure payslips.' },
  { id: 'crm', icon: 'handshake', title: 'Sales CRM', desc: 'Track leads, manage accounts, and monitor your deal pipeline.' },
  { id: 'projects', icon: 'account_tree', title: 'Projects', desc: 'Break down complex initiatives into tasks and track time.' },
  { id: 'helpdesk', icon: 'support_agent', title: 'Help Desk', desc: 'Internal IT/HR support ticketing or customer-facing queues.' },
  { id: 'inventory', icon: 'inventory_2', title: 'Inventory', desc: 'Stock movement ledgers and multi-warehouse support.' },
  { id: 'finance', icon: 'account_balance', title: 'Finance', desc: 'Track Accounts Receivable, Payable, and cash flow.' },
  { id: 'analytics', icon: 'bar_chart', title: 'Analytics', desc: 'Cross-module reporting and actionable business insights.' }
];

const steps = [
  { step: '1', title: 'Sign up', desc: 'Create your account in seconds. No credit card required.' },
  { step: '2', title: 'Set up your org', desc: 'Claim your secure subdomain and define your basic structure.' },
  { step: '3', title: 'Invite your team', desc: 'Assign roles and let your employees log into their new home.' },
  { step: '4', title: 'Start working', desc: 'Rent the modules you need, when you need them, and scale up.' }
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const [activeModules, setActiveModules] = useState({});

  useEffect(() => {
    let timeouts = [];
    modules.forEach((mod, idx) => {
      const timeout = setTimeout(() => {
        setActiveModules(prev => ({ ...prev, [mod.id]: true }));
      }, 500 + (idx * 60));
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F4] text-[#1C2024] font-body-md selection:bg-[#E8A23C]/30">
      
      <nav className="fixed top-0 w-full z-50 bg-[#F7F7F4]/90 backdrop-blur-sm border-b border-[#D8DAD5]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <span className="font-display-md text-xl tracking-tight font-bold text-[#1C2024]">Crewly</span>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-[#5B5F63] hover:text-[#1C2024] transition-colors"
            >
              Sign in
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="text-sm font-medium bg-[#E8A23C] text-[#7A4F14] px-5 py-2 hover:bg-[#d69536] transition-colors rounded-sm"
            >
              Start free trial
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          
          <div className="flex justify-center gap-3 mb-16 flex-wrap">
            {modules.map((mod, idx) => (
              <div key={mod.id} className="w-32 h-32 flex-shrink-0">
                <ModulePanel
                  title={mod.title}
                  description={""}
                  icon={mod.icon}
                  status={activeModules[mod.id] && idx < 4 ? 'active' : 'inactive'}
                  interactive={false}
                  delayIndex={idx}
                  size="small"
                />
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto">
            <h1 className="font-display-lg text-5xl lg:text-7xl text-[#1C2024] mb-6 leading-tight font-bold">
              Turn on only what your team needs.
            </h1>
            
            <p className="font-body-lg text-[#5B5F63] mb-10 max-w-2xl mx-auto leading-relaxed text-lg">
              Crewly is a modular business operating system. Build your precise stack by renting only the modules your organization requires right now. Turn off what you don't.
            </p>
            
            <div className="flex justify-center items-center gap-4">
              <button 
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-[#E8A23C] hover:bg-[#d69536] text-[#7A4F14] font-medium transition-colors rounded-sm text-base shadow-sm"
              >
                Start free trial
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-transparent border border-[#D8DAD5] hover:bg-[#FFFFFF] text-[#1C2024] font-medium transition-colors rounded-sm text-base"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </main>

      <section className="py-24 border-t border-[#D8DAD5] bg-[#FFFFFF]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 max-w-3xl">
            <h2 className="font-display-lg text-4xl text-[#1C2024] mb-4 font-bold">The Platform Modules</h2>
            <p className="font-body-lg text-[#5B5F63] leading-relaxed text-lg">
              Explore the available physical interfaces. Every module integrates seamlessly into your unified organization database. No disjointed SaaS silos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod, idx) => (
              <div key={idx} className="group relative">
                <ModulePanel
                  title={mod.title}
                  description={mod.desc}
                  icon={mod.icon}
                  status="inactive"
                  interactive={true}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-[#D8DAD5] bg-[#F7F7F4]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="font-display-lg text-4xl text-[#1C2024] mb-4 font-bold">How it works</h2>
            <p className="font-body-lg text-[#5B5F63] max-w-2xl mx-auto text-lg">
              From an empty workspace to a fully operational business operating system in minutes.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative bg-[#FFFFFF] border border-[#D8DAD5] p-8 rounded-sm shadow-sm">
                <div className="font-medium text-[#2F9E8F] mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-[#F7F7F4] border border-[#D8DAD5] rounded-sm text-sm font-mono text-[#0F4A42]">
                    {step.step}
                  </span>
                  <span className="text-base text-[#1C2024] font-bold">{step.title}</span>
                </div>
                <p className="text-[#5B5F63] font-body-md leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-[#D8DAD5] bg-[#FFFFFF]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <h2 className="font-display-lg text-4xl text-[#1C2024] mb-4 font-bold">Pricing structure</h2>
            <p className="font-body-lg text-[#5B5F63] text-lg">
              Organization base infrastructure is billed separately from module usage. The separation is the pitch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            <div className="border border-[#D8DAD5] p-8 rounded-sm bg-[#F7F7F4] text-[#1C2024]">
              <h3 className="font-display-lg text-2xl mb-2 font-bold">Organization Subscription</h3>
              <p className="font-body-md text-[#5B5F63] mb-8">Secure infrastructure and core directory.</p>
              <div className="font-display-lg text-4xl mb-8 border-b border-[#D8DAD5] pb-4">Flat Fee</div>
              <ul className="space-y-4 font-body-md text-[#1C2024]">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#5B5F63] text-[20px]">check</span> Custom Subdomain</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#5B5F63] text-[20px]">check</span> Unlimited Core Users</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#5B5F63] text-[20px]">check</span> Roles & Permissions</li>
              </ul>
            </div>
            
            <div className="border border-[#D8DAD5] p-8 rounded-sm bg-[#FFFFFF] text-[#1C2024] relative shadow-sm">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E8A23C]/10 border-b border-l border-[#D8DAD5] rounded-bl-sm flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#E8A23C] animate-pulse-amber"></div>
              </div>
              <h3 className="font-display-lg text-2xl mb-2 font-bold">Per-Module Pricing</h3>
              <p className="font-body-md text-[#5B5F63] mb-8">Pay strictly for active components.</p>
              <div className="font-display-lg text-4xl mb-8 border-b border-[#D8DAD5] pb-4">Per User</div>
              <ul className="space-y-4 font-body-md text-[#1C2024]">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#2F9E8F] text-[20px]">check</span> Activate anytime</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#2F9E8F] text-[20px]">check</span> Pro-rated billing</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#2F9E8F] text-[20px]">check</span> 14-day free trial on all</li>
              </ul>
            </div>
            
          </div>
        </div>
      </section>

      <footer className="border-t border-[#D8DAD5] bg-[#F7F7F4] py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-display-md tracking-tight font-bold text-[#1C2024]">Crewly</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 text-sm text-[#5B5F63] font-medium">
            <a href="#" className="hover:text-[#1C2024] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#1C2024] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#1C2024] transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
};


