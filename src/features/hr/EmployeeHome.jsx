import React, { useState, useEffect } from 'react';
import { useOrg } from '../org/OrgContext';
import { supabase } from '../../lib/supabaseClient';

export const EmployeeHome = () => {
  const { currentMembership, activeOrganization, activeModules } = useOrg();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profile, setProfile] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);

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

  const hasAttendance = activeModules?.includes('attendance');
  const hasLeave = activeModules?.includes('leave');

  const displayName = profile?.full_name || currentMembership?.email?.split('@')[0] || 'Employee';

  const mockRequests = [
    { id: 1, type: 'Annual Leave (3 Days)', date: 'Aug 15 - Aug 17', status: 'approved' },
    { id: 2, type: 'Expense Report', date: 'Jul 28', status: 'pending' },
    { id: 3, type: 'WFH Request', date: 'Jul 25', status: 'rejected' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24">
      
      {/* "Today" Panel */}
      <div className="bg-white border border-outline-variant shadow-sm rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <h1 className="text-4xl font-display-md font-bold text-on-surface mb-1 tracking-tight">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</h1>
          <p className="text-on-surface-variant font-body-md text-lg">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div className="mt-4 text-sm text-on-surface-variant/70">
            Welcome, <span className="text-on-surface font-medium">{displayName}</span>
          </div>
        </div>

        {hasAttendance && (
          <div className="flex flex-col items-center shrink-0">
            <button 
              onClick={() => setClockedIn(!clockedIn)}
              className={`px-12 py-6 rounded-2xl font-bold text-sm shadow-sm transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border ${
                clockedIn 
                  ? 'bg-error-container text-error border-error/20 hover:bg-error-container/80' 
                  : 'bg-primary text-white border-primary hover:bg-primary/90 shadow-md shadow-primary/20'
              }`}
            >
              {clockedIn ? 'Clock out' : 'Clock in'}
            </button>
            {clockedIn && (
              <span className="mt-3 font-medium text-xs text-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Recording active session
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3 Compact Panels Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Leave Balance */}
        <div className="bg-white border border-outline-variant shadow-sm rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[20px]">beach_access</span>
          </div>
          <div className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </div>
          <div className="font-display-md text-3xl font-bold text-on-surface mb-1 tracking-tight">{hasLeave ? '12.5' : '--'}</div>
          <div className="font-medium text-sm text-on-surface-variant">Available leave days</div>
        </div>

        {/* Pending Items */}
        <div className="bg-white border border-outline-variant shadow-sm rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[20px]">checklist</span>
          </div>
          <div className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </div>
          <div className="font-display-md text-3xl font-bold text-on-surface mb-1 tracking-tight">2</div>
          <div className="font-medium text-sm text-[#F59E0B]">Require your attention</div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white border border-outline-variant shadow-sm rounded-2xl p-6">
          <div className="font-medium text-sm text-on-surface-variant mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">notifications</span> Recent alerts
          </div>
          <div className="space-y-4">
             <div className="flex gap-3 items-start">
               <div className="w-8 h-8 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shrink-0">
                 <span className="material-symbols-outlined text-[14px]">check</span>
               </div>
               <div>
                 <div className="font-body-md font-medium text-[13px] text-on-surface">Expense Report Approved</div>
                 <div className="font-body-md text-[11px] text-on-surface-variant mt-0.5">2 hours ago</div>
               </div>
             </div>
             <div className="flex gap-3 items-start">
               <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                 <span className="material-symbols-outlined text-[14px]">info</span>
               </div>
               <div>
                 <div className="font-body-md font-medium text-[13px] text-on-surface">Policy Update v2.4</div>
                 <div className="font-body-md text-[11px] text-on-surface-variant mt-0.5">Yesterday</div>
               </div>
             </div>
          </div>
        </div>

      </div>

      {/* My Requests List */}
      <div className="bg-white border border-outline-variant shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
           <h2 className="font-display-md font-bold text-lg text-on-surface tracking-tight">My requests</h2>
           <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/5 px-3 py-1.5 rounded-full">View all</button>
        </div>
        <div className="divide-y divide-outline-variant">
           {mockRequests.map(req => {
             let statusColor = 'text-on-surface-variant bg-surface-container';
             let icon = 'hourglass_empty';
             if (req.status === 'approved') {
               statusColor = 'text-[#10B981] bg-[#10B981]/10';
               icon = 'check_circle';
             } else if (req.status === 'pending') {
               statusColor = 'text-[#F59E0B] bg-[#F59E0B]/10';
               icon = 'schedule';
             } else if (req.status === 'rejected') {
               statusColor = 'text-error bg-error-container';
               icon = 'cancel';
             }

             return (
               <div key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-container/30 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColor}`}>
                       <span className="material-symbols-outlined text-[20px]">{icon}</span>
                     </div>
                     <div>
                       <div className="font-body-md font-medium text-sm text-on-surface mb-0.5 group-hover:text-primary transition-colors">{req.type}</div>
                       <div className="font-body-md text-xs text-on-surface-variant">{req.date}</div>
                     </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full font-semibold text-xs capitalize ${statusColor}`}>
                     {req.status}
                  </div>
               </div>
             );
           })}
        </div>
      </div>

    </div>
  );
};
