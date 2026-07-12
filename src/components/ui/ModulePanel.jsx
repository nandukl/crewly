import React from 'react';

/**
 * The signature Module Panel component representing the core thesis of Crewly.
 * 
 * @param {string} title - The name of the module.
 * @param {string} description - Brief description of the module.
 * @param {string} icon - Material Symbols icon name.
 * @param {'active' | 'inactive' | 'trial' | 'locked'} status - The current status of the module.
 * @param {boolean} interactive - Whether the panel has a toggle control.
 * @param {function} onToggle - Click handler for the toggle control.
 * @param {boolean} isTransitioning - True if the module is actively toggling on/off (mechanical transition).
 * @param {number} delayIndex - Index for staggered load animation.
 * @param {'default' | 'small'} size - Controls panel density.
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
  // Determine indicator color and animation based on strict status rules
  let indicatorColorClass = 'bg-surface-variant'; // Dim gray (inactive)
  let indicatorAnimation = '';
  
  const isActive = status === 'active';
  const isLocked = status === 'locked';
  
  if (isActive) {
    indicatorColorClass = 'bg-[#E8A23C]'; // --signal-amber
    indicatorAnimation = 'animate-pulse-amber shadow-[0_0_8px_rgba(232,162,60,0.4)]';
  } else if (status === 'trial') {
    indicatorColorClass = 'bg-[#2F9E8F]'; // --current-teal
    indicatorAnimation = 'animate-pulse-teal shadow-[0_0_8px_rgba(47,158,143,0.4)]';
  } else if (isLocked) {
    indicatorColorClass = 'bg-[#C4453A]'; // --alert-red
  }

  const isSmall = size === 'small';

  // Handle mechanical transition when toggling
  const transitionStyles = isTransitioning ? "opacity-80 scale-[0.98]" : "opacity-100 scale-100";
  
  // Staggered load animation style
  const style = delayIndex > 0 ? {
    animationDelay: `${delayIndex * 60}ms`,
    animationFillMode: 'both'
  } : {};
  
  const animateInClass = delayIndex > 0 ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : "";

  return (
    <div 
      className={`relative flex flex-col bg-surface-container-lowest border border-outline-variant rounded-sm ${isSmall ? 'p-4' : 'p-6'} text-left ${transitionStyles} ${animateInClass} w-full h-full ${isLocked ? 'opacity-70' : ''}`}
      style={style}
    >
      {/* Signature 8px Indicator Light, strictly positioned top-right */}
      <div className={`absolute ${isSmall ? 'top-3 right-3' : 'top-4 right-4'} w-2 h-2 rounded-full overflow-visible flex items-center justify-center`}>
         <div className={`w-2 h-2 rounded-full ${indicatorColorClass} ${indicatorAnimation}`}></div>
      </div>
      
      {/* Icon */}
      <div className={`text-on-surface ${isSmall ? 'mb-2' : 'mb-4'}`}>
        <span className={`material-symbols-outlined ${isSmall ? 'text-[24px]' : 'text-[32px]'} font-light ${isLocked ? 'text-[#C4453A]' : ''}`}>{icon}</span>
      </div>
      
      {/* Text */}
      <h3 className={`font-display-md text-on-surface ${isSmall ? 'text-sm mb-0' : 'text-xl mb-2'}`}>{title}</h3>
      
      {!isSmall && (
        <p className="font-body-md text-on-surface-variant text-sm flex-grow leading-relaxed">
          {description}
        </p>
      )}
      
      {/* Toggle Control / Status Footer */}
      {!isSmall && (
        <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center justify-between w-full h-10">
           {isLocked ? (
             <span className="font-label-md text-[#C4453A] uppercase tracking-widest text-[10px] flex items-center gap-2">
               <span className="material-symbols-outlined text-[14px]">lock</span>
               Requires Enterprise Plan
             </span>
           ) : interactive ? (
             <div className="flex items-center gap-3">
               <span className="font-label-md text-on-surface-variant uppercase tracking-widest text-[10px]">
                 {isActive ? 'Module Active' : 'Module Offline'}
               </span>
               <button
                 onClick={onToggle}
                 disabled={isTransitioning}
                 className="relative w-10 h-5 bg-surface-container border border-outline-variant rounded-full overflow-hidden transition-colors outline-none focus:border-[#E8A23C]"
                 aria-label={`Toggle ${title}`}
               >
                 <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-transform duration-150 ${isActive ? 'translate-x-5 bg-[#E8A23C]' : 'translate-x-0 bg-outline-variant'}`}></div>
               </button>
             </div>
           ) : (
             <span className="font-label-md text-on-surface-variant/50 uppercase tracking-widest text-[10px]">
               CRWLY // OS
             </span>
           )}
        </div>
      )}
    </div>
  );
};
