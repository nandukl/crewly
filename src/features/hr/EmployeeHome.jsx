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
      <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <h1 className="text-4xl font-display-md font-bold text-on-surface mb-1">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</h1>
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
              className={`px-12 py-6 rounded-sm font-medium text-sm shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] border ${
                clockedIn 
                  ? 'bg-surface-container text-[#E8A23C] border-[#E8A23C]/50 hover:bg-surface-container-high' 
                  : 'bg-[#E8A23C] text-[#14161A] border-[#E8A23C] hover:bg-[#d69536] shadow-[0_0_16px_rgba(232,162,60,0.4)]'
              }`}
            >
              {clockedIn ? 'Clock out' : 'Clock in'}
            </button>
            {clockedIn && (
              <span className="mt-3 font-mono text-xs text-[#E8A23C] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8A23C] animate-pulse-amber"></span>
                Recording active session
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3 Compact Panels Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Leave Balance */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-5 relative overflow-hidden group hover:border-outline transition-colors cursor-pointer">
          <div className="absolute top-0 right-0 w-8 h-8 bg-surface-container flex items-center justify-center rounded-bl-sm border-l border-b border-outline-variant group-hover:bg-outline-variant/20 transition-colors">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">open_in_new</span>
          </div>
          <div className="font-medium text-sm text-on-surface-variant mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">beach_access</span> Leave balance
          </div>
          <div className="font-mono text-3xl text-white mb-1">{hasLeave ? '12.5' : '--'}</div>
          <div className="font-body-md text-xs text-on-surface-variant">Days available</div>
        </div>

        {/* Pending Items */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-5 relative overflow-hidden group hover:border-outline transition-colors cursor-pointer">
          <div className="absolute top-0 right-0 w-8 h-8 bg-surface-container flex items-center justify-center rounded-bl-sm border-l border-b border-outline-variant group-hover:bg-outline-variant/20 transition-colors">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">open_in_new</span>
          </div>
          <div className="font-medium text-sm text-on-surface-variant mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">checklist</span> Pending items
          </div>
          <div className="font-mono text-3xl text-white mb-1">2</div>
          <div className="font-body-md text-xs text-[#E8A23C]">Require your attention</div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-5">
          <div className="font-medium text-sm text-on-surface-variant mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">notifications</span> Recent alerts
          </div>
          <div className="space-y-3">
             <div className="flex gap-2 items-start">
               <span className="w-1.5 h-1.5 rounded-full bg-[#2F9E8F] shrink-0 mt-1.5"></span>
               <div>
                 <div className="font-body-md font-medium text-[13px] text-white">Expense Report Approved</div>
                 <div className="font-body-md text-[11px] text-on-surface-variant mt-0.5">2 hours ago</div>
               </div>
             </div>
             <div className="flex gap-2 items-start">
               <span className="w-1.5 h-1.5 rounded-full bg-outline-variant shrink-0 mt-1.5"></span>
               <div>
                 <div className="font-body-md font-medium text-[13px] text-white">Policy Update v2.4</div>
                 <div className="font-body-md text-[11px] text-on-surface-variant mt-0.5">Yesterday</div>
               </div>
             </div>
          </div>
        </div>

      </div>

      {/* My Requests List */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container">
           <h2 className="font-medium text-sm text-white">My requests</h2>
           <button className="text-xs font-medium text-on-surface-variant hover:text-white transition-colors">View all</button>
        </div>
        <div className="divide-y divide-outline-variant">
           {mockRequests.map(req => {
             let statusColor = 'text-on-surface-variant border-outline-variant';
             let dotColor = 'bg-outline-variant';
             if (req.status === 'approved') {
               statusColor = 'text-[#2F9E8F] border-[#2F9E8F]/30 bg-[#2F9E8F]/10';
               dotColor = 'bg-[#2F9E8F]';
             } else if (req.status === 'pending') {
               statusColor = 'text-[#E8A23C] border-[#E8A23C]/30 bg-[#E8A23C]/10';
               dotColor = 'bg-[#E8A23C]';
             } else if (req.status === 'rejected') {
               statusColor = 'text-[#C4453A] border-[#C4453A]/30 bg-[#C4453A]/10';
               dotColor = 'bg-[#C4453A]';
             }

             return (
               <div key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-container/50 transition-colors">
                  <div className="flex items-center gap-4">
                     <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                     <div>
                       <div className="font-body-md font-medium text-sm text-white mb-0.5">{req.type}</div>
                       <div className="font-body-md text-xs text-on-surface-variant">{req.date}</div>
                     </div>
                  </div>
                  <div className={`px-2 py-1 border rounded-sm font-medium text-xs capitalize ${statusColor}`}>
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
