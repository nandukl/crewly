import React from 'react';

import { WriteGate } from './WriteGate';

export const Button = React.forwardRef(({ children, variant = 'primary', className = '', isLoading, actionType, ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center py-2 px-6 font-medium rounded-xl transition-all duration-200 focus:outline-none focus-ring disabled:opacity-50 disabled:cursor-not-allowed border";
  
  const variants = {
    primary: "bg-primary border-primary text-white hover:bg-primary/90 shadow-sm hover:shadow active:scale-95",
    secondary: "bg-white border-outline-variant text-on-surface hover:bg-surface-container shadow-sm hover:border-outline active:scale-95",
    danger: "bg-error border-error text-white hover:bg-error/90 shadow-sm active:scale-95",
    outline: "border-outline-variant text-on-surface hover:bg-surface-container-lowest active:scale-95",
    ghost: "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface active:scale-95"
  };

  const buttonElement = (
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

  if (actionType === 'write') {
    return <WriteGate>{buttonElement}</WriteGate>;
  }

  return buttonElement;
});

Button.displayName = 'Button';
