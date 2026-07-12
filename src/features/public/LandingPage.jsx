import React from 'react';
import { useNavigate } from 'react-router-dom';

const modules = [
  { icon: 'groups', title: 'HR & Directory', desc: 'Centralized employee directory, org charts, and core records.' },
  { icon: 'schedule', title: 'Attendance', desc: 'Clock in/out tracking, timesheets, and correction workflows.' },
  { icon: 'event_available', title: 'Leave Management', desc: 'Custom policies, balance tracking, and approval chains.' },
  { icon: 'payments', title: 'Global Payroll', desc: 'Automated salary structures, deductions, and secure payslips.' },
  { icon: 'handshake', title: 'Sales CRM', desc: 'Track leads, manage accounts, and monitor your deal pipeline.' },
  { icon: 'account_tree', title: 'Projects', desc: 'Break down complex initiatives into tasks and track time.' },
  { icon: 'support_agent', title: 'Help Desk', desc: 'Internal IT/HR support ticketing or customer-facing queues.' },
  { icon: 'inventory_2', title: 'Inventory', desc: 'Stock movement ledgers and multi-warehouse support.' },
  { icon: 'account_balance', title: 'Finance', desc: 'Track Accounts Receivable, Payable, and cash flow.' }
];

const steps = [
  { step: '01', title: 'Sign up', desc: 'Create your account in seconds. No credit card required.' },
  { step: '02', title: 'Set up your org', desc: 'Claim your secure subdomain and define your basic structure.' },
  { step: '03', title: 'Invite your team', desc: 'Assign roles and let your employees log into their new home.' },
  { step: '04', title: 'Start working', desc: 'Rent the modules you need, when you need them, and scale up.' }
];

export const LandingPage = () => {
  const navigate = useNavigate();

  const handleNav = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-body-md overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">rocket_launch</span>
            </div>
            <span className="font-headline-md font-bold text-xl tracking-tight text-white">Crewly</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button onClick={() => handleNav('modules')} className="hover:text-white transition-colors">Modules</button>
            <button onClick={() => handleNav('how-it-works')} className="hover:text-white transition-colors">How it Works</button>
            <button onClick={() => handleNav('pricing')} className="hover:text-white transition-colors">Pricing</button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="text-sm font-bold bg-white text-slate-950 px-5 py-2 rounded-full hover:bg-slate-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              Start free trial
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-[896px] mx-auto text-center relative z-10">
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-400 mb-6 leading-[1.1]">
            Run your business, module by module.
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 mb-10 max-w-[672px] mx-auto leading-relaxed">
            Replace your disjointed stack of HR, CRM, Finance, and Project tools with a single, beautifully engineered platform. Only activate what you need.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 text-lg"
            >
              Start free trial
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Abstract Dashboard Preview UI */}
        <div className="max-w-[1152px] mx-auto mt-20 relative z-10 perspective-[2000px]">
          <div className="w-full aspect-[16/9] rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-sm overflow-hidden flex flex-col relative transform rotateX-[10deg] scale-95 origin-bottom transition-transform duration-700 hover:rotateX-0 hover:scale-100">
            <div className="h-12 border-b border-slate-800 flex items-center px-4 gap-4 bg-slate-900/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              </div>
              <div className="h-5 w-48 bg-slate-800 rounded mx-auto"></div>
            </div>
            <div className="flex flex-1">
              <div className="w-48 border-r border-slate-800 p-4 space-y-3 hidden sm:block">
                {[1,2,3,4,5,6].map(i => <div key={i} className={`h-6 rounded ${i === 1 ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-800/50'}`}></div>)}
              </div>
              <div className="flex-1 p-6 space-y-6">
                <div className="flex gap-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex-1 h-24 bg-slate-800/30 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                      <div className="h-3 w-16 bg-slate-700 rounded"></div>
                      <div className="h-6 w-24 bg-slate-600 rounded"></div>
                    </div>
                  ))}
                </div>
                <div className="h-48 bg-slate-800/30 border border-slate-800 rounded-xl"></div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </main>

      {/* Trust Signals */}
      <div className="border-y border-slate-800 bg-slate-900/30 py-8 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-wrap justify-center gap-8 md:gap-16 items-center text-slate-500 text-sm font-medium">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined">security</span> Multi-tenant Isolation</div>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined">public</span> Global Data Residency</div>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined">verified_user</span> Enterprise-grade Security</div>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined">rocket_launch</span> Built for Growing Teams</div>
        </div>
      </div>

      {/* Feature Marketplace Section */}
      <section id="modules" className="py-24 bg-slate-900/50 border-b border-slate-800 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-[768px] mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Rent only what you need.</h2>
            <p className="text-slate-400 text-lg">
              Crewly features an internal App Marketplace. Don't need Inventory Management? Turn it off. Want to add CRM later? One click install. You only pay for active modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:bg-slate-900 transition-colors group relative overflow-hidden">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors text-slate-400 relative z-10">
                  <span className="material-symbols-outlined text-[28px]">{mod.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 relative z-10">{mod.title}</h3>
                <p className="text-slate-400 leading-relaxed relative z-10">{mod.desc}</p>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">How it works</h2>
            <p className="text-slate-400 text-lg">From empty workspace to fully operational in minutes.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="text-5xl font-black text-slate-800 mb-6">{step.step}</div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-24 right-0 h-px bg-slate-800"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-900/50 border-t border-slate-800 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Simple, transparent pricing.</h2>
          <p className="text-slate-400 text-lg max-w-[600px] mx-auto mb-16">
            Pay a flat platform fee, plus a small per-user cost for only the modules you actually turn on.
          </p>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 max-w-[800px] mx-auto">
            <div className="flex-1 bg-slate-950 border border-slate-800 p-10 rounded-3xl w-full">
              <h3 className="text-2xl font-bold text-white mb-2">Platform Subscription</h3>
              <div className="text-slate-400 mb-6">Your organization's base</div>
              <div className="text-5xl font-black text-white mb-6">Talk to us</div>
              <ul className="text-left space-y-4 text-slate-300 mb-8">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-indigo-400 text-xl">check_circle</span> Custom Subdomain</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-indigo-400 text-xl">check_circle</span> Unlimited Core Users</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-indigo-400 text-xl">check_circle</span> Roles & Permissions</li>
              </ul>
            </div>
            
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex-shrink-0">
              <span className="material-symbols-outlined">add</span>
            </div>
            
            <div className="flex-1 bg-gradient-to-b from-indigo-900/40 to-slate-950 border border-indigo-500/30 p-10 rounded-3xl w-full relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              <h3 className="text-2xl font-bold text-white mb-2">Per Module Cost</h3>
              <div className="text-slate-400 mb-6">Pay for what you use</div>
              <div className="text-5xl font-black text-white mb-6">Modular</div>
              <ul className="text-left space-y-4 text-slate-300 mb-8">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-indigo-400 text-xl">check_circle</span> Activate anytime</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-indigo-400 text-xl">check_circle</span> Pro-rated billing</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-indigo-400 text-xl">check_circle</span> 14-day free trial on all</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 relative z-10 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none transform translate-y-1/2"></div>
        <div className="max-w-[896px] mx-auto text-center px-6">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">Ready to streamline your business?</h2>
          <p className="text-xl text-slate-400 mb-10">Start your 14-day free trial. Setup takes less than 5 minutes.</p>
          <button 
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white text-slate-950 font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)] text-lg"
          >
            Start free trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-indigo-500">rocket_launch</span>
            <span className="font-bold tracking-tight text-white">Crewly</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 text-sm text-slate-400">
            <button onClick={() => navigate('/login')} className="text-indigo-400 hover:text-indigo-300 font-medium">
              Existing customer? Sign in to your workspace
            </button>
            <div className="hidden md:block w-px h-4 bg-slate-800"></div>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

