'use client';
import React, { useState } from 'react';

interface PatientRegistrationProps {
  onRegister: (name: string, isEmergency?: boolean) => Promise<number | null>;
}

export default function PatientRegistration({ onRegister }: PatientRegistrationProps) {
  const [name, setName] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [issuedToken, setIssuedToken] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    const token = await onRegister(name.trim(), isEmergency);

    if (token !== null) {
      setIssuedToken(token);
      setName('');
      setIsEmergency(false);
      // Auto-clear token display after 10 seconds
      setTimeout(() => setIssuedToken(null), 10000);
    } else {
      setError('Registration failed. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-2xl p-[24px] transition-all duration-200 hover:border-[#bcc9c6] h-fit">
      <div className="flex items-center gap-[8px] mb-[24px]">
        <span className="material-symbols-outlined text-[#008378]" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
        <h3 className="text-[20px] font-semibold leading-[28px] text-[#131b2e]">Patient Registration</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-[24px]">
        <div className="space-y-[8px]">
          <label className="text-[14px] font-semibold leading-[20px] tracking-[0.05em] text-[#3d4947]">
            Patient Full Name
          </label>
          <input
            className="w-full p-[24px] border border-[#e2e8f0] rounded-lg text-[16px] focus:border-[#00685f] focus:ring-0 transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter patient full name..."
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Emergency toggle */}
        <div 
          className={`flex items-center gap-[12px] p-[16px] border border-dashed rounded-lg select-none cursor-pointer transition-all ${
            isEmergency 
              ? 'bg-red-50 border-red-300 text-red-700' 
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
          }`}
          onClick={() => setIsEmergency(!isEmergency)}
        >
          <input
            type="checkbox"
            id="is-emergency-checkbox"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
            disabled={isLoading}
            onClick={(e) => e.stopPropagation()} // Prevent double-trigger when clicking checkbox directly
            className="w-5 h-5 accent-red-600 rounded cursor-pointer"
          />
          <label htmlFor="is-emergency-checkbox" className="flex items-center gap-1.5 text-[14px] font-bold cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">emergency</span>
            <span>Emergency Priority Case</span>
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="w-full py-[24px] bg-[#00685f] text-white rounded-lg text-[20px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-[16px] shadow-sm shadow-[#00685f]/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Registering...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">assignment_ind</span>
              Register &amp; Issue Token
            </>
          )}
        </button>

        {/* Token Display */}
        <div
          className={`mt-[24px] p-[24px] border border-dashed rounded-lg flex flex-col items-center justify-center gap-[8px] min-h-[100px] transition-all duration-500 ${
            issuedToken
              ? 'bg-[#f0fdf9] border-[#00685f]/40'
              : 'bg-[#f2f3ff] border-[#bcc9c6]'
          }`}
          id="token-placeholder"
        >
          <p className="text-[12px] font-medium leading-[16px] text-[#3d4947] uppercase tracking-wider">
            Token Generated
          </p>
          {issuedToken ? (
            <>
              <span className="text-[40px] font-extrabold text-[#00685f] tracking-tight animate-pulse">
                T-{issuedToken}
              </span>
              <p className="text-[11px] text-[#3d4947] text-center px-4">
                ✓ Patient added to queue
              </p>
            </>
          ) : (
            <>
              <span className="text-[24px] font-bold leading-[32px] tracking-[-0.01em] text-[#bcc9c6]">
                ---
              </span>
              <p className="text-[10px] text-[#3d4947] text-center px-4">
                New tokens will appear here after successful registration
              </p>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
