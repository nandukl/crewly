import React from 'react';

export const Input = React.forwardRef(({ label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col space-y-sm w-full">
      {label && <label className="text-sm font-medium text-on-surface ml-1">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-4 py-2.5 bg-white border rounded-xl font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none transition-all duration-200 focus-ring shadow-sm ${
          error ? 'border-error focus:ring-error' : 'border-outline-variant hover:border-outline focus:border-primary'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-error mt-1">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
