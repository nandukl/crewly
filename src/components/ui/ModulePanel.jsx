import React from 'react';

/**
 * Modern App Store style Module Panel.
 */
export const ModulePanel = ({
  title,
  description,
  icon,
  status = 'inactive',
  interactive = false,
  onToggle,
  isTransitioning = false,
  delayIndex = 0,
  size = 'default'
}) => {
  const isActive = status === 'active';
  const isLocked = status === 'locked';
  
  // Icon squircle background colors
  let iconBgClass = 'bg-primary/10 text-primary';
  if (icon === 'schedule' || icon === 'event_available') iconBgClass = 'bg-[#10B981]/10 text-[#10B981]'; // Green for HR
  if (icon === 'payments' || icon === 'account_balance') iconBgClass = 'bg-[#F59E0B]/10 text-[#F59E0B]'; // Amber for Finance
  if (icon === 'handshake' || icon === 'support_agent') iconBgClass = 'bg-[#8B5CF6]/10 text-[#8B5CF6]'; // Purple for Customer
  if (icon === 'account_tree' || icon === 'inventory_2') iconBgClass = 'bg-[#3B82F6]/10 text-[#3B82F6]'; // Blue for Ops

  if (isLocked) {
    iconBgClass = 'bg-surface-container text-on-surface-variant';
  }

  const isSmall = size === 'small';
  const transitionStyles = isTransitioning ? "opacity-70 scale-[0.98]" : "opacity-100 scale-100";
  
  const style = delayIndex > 0 ? {
    animationDelay: `${delayIndex * 60}ms`,
    animationFillMode: 'both'
  } : {};
  
  const animateInClass = delayIndex > 0 ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : "";

  return (
    <div 
      className={`relative flex flex-col bg-white border border-outline-variant rounded-2xl ${isSmall ? 'p-4' : 'p-6'} text-left ${transitionStyles} ${animateInClass} w-full h-full hover:shadow-md hover:border-outline transition-all duration-300 ${isLocked ? 'opacity-80' : ''}`}
      style={style}
    >
      <div className="flex gap-4">
        {/* Squircle Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${iconBgClass}`}>
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
        
        <div className="flex flex-col flex-grow">
          {/* Text */}
          <h3 className={`font-display-md text-on-surface font-bold tracking-tight ${isSmall ? 'text-sm mb-0' : 'text-lg mb-1'}`}>{title}</h3>
          
          {!isSmall && (
            <p className="font-body-md text-on-surface-variant text-sm leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* Footer Button */}
      {!isSmall && (
        <div className="mt-auto pt-6 flex items-center justify-between w-full">
           {isLocked ? (
             <div className="flex items-center justify-between w-full">
               <span className="font-medium text-error text-xs flex items-center gap-1.5 bg-error-container px-2.5 py-1 rounded-full">
                 <span className="material-symbols-outlined text-[14px]">lock</span>
                 Pro Plan
               </span>
               <button className="text-xs font-semibold px-4 py-1.5 bg-surface-container text-on-surface-variant rounded-full cursor-not-allowed">
                 Upgrade
               </button>
             </div>
           ) : interactive ? (
             <div className="flex items-center justify-between w-full">
               {isActive ? (
                 <span className="text-xs font-medium text-current-teal flex items-center gap-1">
                   Installed
                 </span>
               ) : (
                 <span className="text-xs font-medium text-on-surface-variant">
                   Available
                 </span>
               )}
               <button
                 onClick={onToggle}
                 disabled={isTransitioning}
                 className={`text-xs font-bold px-5 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${
                   isActive
                     ? 'bg-surface-container text-on-surface hover:bg-outline-variant shadow-sm'
                     : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                 }`}
               >
                 {isActive ? 'Open' : 'Get'}
               </button>
             </div>
           ) : (
             <span className="font-medium text-on-surface-variant/50 text-xs">
               System Module
             </span>
           )}
        </div>
      )}
    </div>
  );
};
