import React from 'react';
import { useNavigate } from 'react-router-dom';

const features = [
  { icon: 'groups', title: 'Core HR', desc: 'Centralized employee directory, dynamic org charts, and role-based access control.' },
  { icon: 'payments', title: 'Global Payroll', desc: 'Automated salary structures, deductions, and instantaneous payslip generation.' },
  { icon: 'handshake', title: 'Sales CRM', desc: 'Track leads, manage accounts, and monitor your deal pipeline in real-time.' },
  { icon: 'account_tree', title: 'Project Management', desc: 'Break down complex initiatives into tasks, milestones, and deliverables.' },
  { icon: 'inventory_2', title: 'Inventory tracking', desc: 'Immutable stock movement ledgers and multi-warehouse location support.' },
  { icon: 'account_balance', title: 'Finance & Ledger', desc: 'Seamlessly track Accounts Receivable, Payable, and cash flow margins.' }
];

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-body-md overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">rocket_launch</span>
            </div>
            <span className="font-headline-md font-bold text-xl tracking-tight text-white">Crewly</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Admin Login
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="text-sm font-bold bg-white text-slate-950 px-5 py-2 rounded-full hover:bg-slate-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              Create Workspace
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-[896px] mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-medium text-indigo-300 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Crewly v2.0 is now live
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-400 mb-8 leading-[1.1]">
            The All-in-One Operating System for Modern Teams
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 mb-10 max-w-[672px] mx-auto leading-relaxed">
            Replace your disjointed stack of HR, CRM, Finance, and Project tools with a single, beautifully engineered platform. Only activate the modules you actually need.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 text-lg"
            >
              Start for free
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-full transition-all border border-slate-700 flex items-center justify-center gap-2 text-lg"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              Admin Login
            </button>
          </div>
        </div>

        {/* Abstract Dashboard Preview UI */}
        <div className="max-w-[1152px] mx-auto mt-20 relative z-10 perspective-[2000px]">
          <div className="w-full aspect-[16/9] rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-sm overflow-hidden flex flex-col relative transform rotateX-[10deg] scale-95 origin-bottom transition-transform duration-700 hover:rotateX-0 hover:scale-100">
            {/* Mock Header */}
            <div className="h-12 border-b border-slate-800 flex items-center px-4 gap-4 bg-slate-900/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              </div>
              <div className="h-5 w-48 bg-slate-800 rounded mx-auto"></div>
            </div>
            {/* Mock Body */}
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
            {/* Overlay Gradient for fade out effect at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </main>

      {/* Feature Marketplace Section */}
      <section className="py-24 bg-slate-900/50 border-t border-slate-800 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-[768px] mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">A perfectly tailored workspace.</h2>
            <p className="text-slate-400 text-lg">
              Crewly features an internal App Marketplace. Don't need Inventory Management? Turn it off. Want to add CRM later? One click install. Your sidebar stays perfectly clean.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:bg-slate-800/50 transition-colors group">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors text-slate-400">
                  <span className="material-symbols-outlined text-[28px]">{feat.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none transform translate-y-1/2"></div>
        <div className="max-w-[896px] mx-auto text-center px-6">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">Ready to streamline your business?</h2>
          <p className="text-xl text-slate-400 mb-10">Join forward-thinking companies running their entire operations on Crewly.</p>
          <button 
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white text-slate-950 font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)] text-lg"
          >
            Create your workspace today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <span className="material-symbols-outlined text-xl">rocket_launch</span>
            <span className="font-bold tracking-tight">Crewly © 2024</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
