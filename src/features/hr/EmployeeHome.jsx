import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { supabase } from '../../lib/supabaseClient';

export const EmployeeHome = () => {
  const { currentMembership, activeOrganization } = useOrg();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (currentMembership?.user_id) {
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('id', currentMembership.user_id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, [currentMembership]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = profile?.full_name || currentMembership?.email?.split('@')[0] || 'Employee';

  return (
    <div className="max-w-7xl mx-auto py-8 font-body-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-3xl p-8 mb-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-on-primary/80 font-bold tracking-wider uppercase text-sm mb-2">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="text-4xl md:text-5xl font-headline-lg font-bold mb-2">{getGreeting()}, {displayName}!</h1>
            <p className="text-lg text-on-primary/90 opacity-90">Ready for another great day at {activeOrganization?.name}?</p>
          </div>
          <div className="bg-surface/20 backdrop-blur-md rounded-2xl p-6 text-center min-w-[160px] border border-white/10 shadow-inner">
            <div className="text-3xl font-headline-md font-bold text-white mb-1">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm font-bold text-white/70 uppercase tracking-widest">Local Time</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Actions & Overview */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Actions */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h2 className="text-title-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">bolt</span>
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button onClick={() => alert('Web Clock In will be available soon!')} className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container hover:bg-surface-container-highest rounded-xl transition-all hover:scale-[1.02] active:scale-95 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined">fingerprint</span>
                </div>
                <span className="font-bold text-sm text-on-surface text-center">Web Clock In</span>
              </button>
              
              <button onClick={() => alert('Leave Request portal will be available soon!')} className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container hover:bg-surface-container-highest rounded-xl transition-all hover:scale-[1.02] active:scale-95 group">
                <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
                  <span className="material-symbols-outlined">event_busy</span>
                </div>
                <span className="font-bold text-sm text-on-surface text-center">Request Leave</span>
              </button>
              
              <button onClick={() => alert('Expense Reporting will be available soon!')} className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container hover:bg-surface-container-highest rounded-xl transition-all hover:scale-[1.02] active:scale-95 group">
                <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <span className="font-bold text-sm text-on-surface text-center">File Expense</span>
              </button>
              
              <button onClick={() => alert('IT Ticketing will be available soon!')} className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container hover:bg-surface-container-highest rounded-xl transition-all hover:scale-[1.02] active:scale-95 group">
                <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center group-hover:bg-error group-hover:text-on-error transition-colors">
                  <span className="material-symbols-outlined">support_agent</span>
                </div>
                <span className="font-bold text-sm text-on-surface text-center">IT Ticket</span>
              </button>
            </div>
          </div>

          {/* Today's Overview (Personal) */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
             <h2 className="text-title-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">monitoring</span>
              My Today
            </h2>
            <div className="flex flex-col sm:flex-row gap-6">
               <div className="flex-1 bg-surface-container-low rounded-xl p-5 border border-outline-variant/50 relative overflow-hidden">
                 <div className="absolute right-[-20px] top-[-20px] opacity-5">
                   <span className="material-symbols-outlined text-[100px]">work_history</span>
                 </div>
                 <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Current Shift</p>
                 <h3 className="text-2xl font-bold text-on-surface mb-2">9:00 AM - 5:00 PM</h3>
                 <div className="flex items-center gap-2 text-sm text-primary font-bold">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                   On Time
                 </div>
               </div>

               <div className="flex-1 bg-surface-container-low rounded-xl p-5 border border-outline-variant/50 relative overflow-hidden">
                 <div className="absolute right-[-20px] top-[-20px] opacity-5">
                   <span className="material-symbols-outlined text-[100px]">pending_actions</span>
                 </div>
                 <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pending Approvals</p>
                 <h3 className="text-2xl font-bold text-on-surface mb-2">0</h3>
                 <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                   You're all caught up!
                 </div>
               </div>
            </div>
          </div>

        </div>

        {/* Right Column - Balances & News */}
        <div className="space-y-6">
          
          {/* Leave Balances */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h2 className="text-title-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">beach_access</span>
              My Time Off
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">flight</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Annual Leave</p>
                    <p className="text-xs text-on-surface-variant">Accrued</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl text-primary">12</p>
                  <p className="text-xs text-on-surface-variant">Days Left</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">healing</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Sick Leave</p>
                    <p className="text-xs text-on-surface-variant">Yearly allocation</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl text-secondary">5</p>
                  <p className="text-xs text-on-surface-variant">Days Left</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h2 className="text-title-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-warning">celebration</span>
              My Upcoming
            </h2>
            
            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant before:to-transparent">
              {/* Event 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-secondary-container text-on-secondary-container shadow shrink-0 z-10">
                  <span className="material-symbols-outlined text-[18px]">cake</span>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-on-surface text-sm">Company Anniversary</div>
                    <time className="font-caveat font-medium text-primary text-xs">Aug 15</time>
                  </div>
                  <div className="text-slate-500 text-xs">Annual celebration!</div>
                </div>
              </div>
              
              {/* Event 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-tertiary-container text-on-tertiary-container shadow shrink-0 z-10">
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-on-surface text-sm">Town Hall</div>
                    <time className="font-caveat font-medium text-primary text-xs">Aug 20</time>
                  </div>
                  <div className="text-slate-500 text-xs">Q3 Review</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
      
    </div>
  );
};
