import React from 'react';

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-body-md text-primary bg-background">
      <main className="w-full max-w-[480px] flex flex-col items-center">
        {/* Brand Presence */}
        <div className="mb-12 text-center">
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2">{title}</h1>
          {subtitle && <p className="text-on-surface-variant">{subtitle}</p>}
        </div>

        {/* Auth Card */}
        <div className="w-full bg-surface shadow-sm border border-outline rounded-lg p-8">
          {children}
        </div>

        {/* System Footer */}
        <footer className="mt-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary flex items-center justify-center rounded">
                <span className="material-symbols-outlined text-white text-[16px]">shield_person</span>
              </div>
              <span className="font-headline-lg text-[18px] tracking-tight text-primary">Crewly</span>
            </div>
            <p className="text-[12px] text-on-surface-variant opacity-60">© 2024 Crewly Inc. v4.2.0-stable</p>
          </div>
        </footer>
      </main>
    </div>
  );
};
