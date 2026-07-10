import React from 'react';

export const Button = React.forwardRef(({ children, variant = 'primary', className = '', isLoading, ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center py-md px-lg font-title-lg text-title-lg rounded-lg transition-all focus:outline-none focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-secondary text-white hover:bg-blue-600",
    secondary: "bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low font-label-md text-label-md",
    danger: "bg-error text-white hover:bg-red-700",
    outline: "border border-outline-variant text-on-surface hover:bg-surface-container-low font-label-md text-label-md",
    ghost: "text-on-surface-variant hover:bg-surface-container-low font-label-md text-label-md"
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
