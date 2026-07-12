import React from 'react';

export const AuthLayout = ({ children, title, subtitle, step }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-body-md bg-[#F7F7F4] text-[#1C2024] selection:bg-[#E8A23C]/30">
      <main className="w-full max-w-[440px] flex flex-col">
        
        {/* Sequence Indicator */}
        {step && (
          <div className="mb-12 flex justify-center">
            <div className="flex items-center gap-4 text-sm text-[#5B5F63] font-medium">
              <span className={`flex items-center gap-2 transition-colors ${step === 1 ? 'text-[#1C2024]' : ''}`}>
                <span className="font-mono text-xs">01</span> Account
              </span>
              <span className="w-4 border-t border-[#D8DAD5]"></span>
              <span className={`flex items-center gap-2 transition-colors ${step === 2 ? 'text-[#1C2024]' : ''}`}>
                <span className="font-mono text-xs">02</span> Verify
              </span>
              <span className="w-4 border-t border-[#D8DAD5]"></span>
              <span className={`flex items-center gap-2 transition-colors ${step === 3 ? 'text-[#1C2024]' : ''}`}>
                <span className="font-mono text-xs">03</span> Workspace
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-display-md text-3xl text-[#1C2024] mb-2 font-bold">{title}</h1>
          {subtitle && <p className="text-[#5B5F63] text-sm">{subtitle}</p>}
        </div>

        {/* Content Panel */}
        <div className="w-full bg-[#FFFFFF] border border-[#D8DAD5] p-8 md:p-10 rounded-sm shadow-sm">
          {children}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs font-medium text-[#5B5F63]">
          Powered by <span className="text-[#1C2024]">Crewly</span>
        </footer>
      </main>
    </div>
  );
};
