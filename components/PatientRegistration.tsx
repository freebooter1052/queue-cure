'use client';
import React, { useState } from 'react';

interface PatientRegistrationProps {
  onRegister: (name: string) => Promise<number | null>;
}

export default function PatientRegistration({ onRegister }: PatientRegistrationProps) {
  const [name, setName] = useState('');
  const [issuedToken, setIssuedToken] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const token = await onRegister(name.trim());
    if (token) {
      setIssuedToken(token);
      setName('');
    }
  };

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-2xl p-[24px] transition-all duration-200 hover:border-[#bcc9c6] h-fit">
      <div className="flex items-center gap-[8px] mb-[24px]">
        <span className="material-symbols-outlined text-[#008378]" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
        <h3 className="text-[20px] font-semibold leading-[28px] text-[#131b2e]">Patient Registration</h3>
      </div>
      <div className="space-y-[24px]">
        <div className="space-y-[8px]">
          <label className="text-[14px] font-semibold leading-[20px] tracking-[0.05em] text-[#3d4947]">Patient Full Name</label>
          <input 
            className="w-full p-[24px] border border-[#e2e8f0] rounded-lg text-[16px] focus:border-[#00685f] focus:ring-0 transition-colors outline-none" 
            placeholder="Enter patient full name..." 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button 
          onClick={handleSubmit}
          className="w-full py-[24px] bg-[#00685f] text-white rounded-lg text-[20px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-[16px] shadow-sm shadow-[#00685f]/20"
        >
          <span className="material-symbols-outlined">assignment_ind</span>
          Register & Issue Token
        </button>
        <div className="mt-[24px] p-[24px] bg-[#f2f3ff] border border-dashed border-[#bcc9c6] rounded-lg flex flex-col items-center justify-center gap-[8px] min-h-[100px]" id="token-placeholder">
          <p className="text-[12px] font-medium leading-[16px] text-[#3d4947] uppercase tracking-wider">Token Generated</p>
          <span className={`text-[24px] font-bold leading-[32px] tracking-[-0.01em] ${issuedToken ? 'text-[#00685f]' : 'text-[#bcc9c6]'}`}>
            {issuedToken ? `T-${issuedToken}` : '---'}
          </span>
          <p className="text-[10px] text-[#3d4947] text-center px-4">New tokens will appear here after successful registration</p>
        </div>
      </div>
    </div>
  );
}
