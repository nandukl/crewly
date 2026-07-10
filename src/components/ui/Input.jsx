import React from 'react';

export const Input = React.forwardRef(({ label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col space-y-sm w-full">
      {label && <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-md py-[10px] bg-white border rounded-lg font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none transition-all focus-ring ${
          error ? 'border-error focus:ring-error' : 'border-outline-variant'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-error mt-1">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
