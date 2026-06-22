'use client';
import React from 'react';

interface Patient {
  id: number;
  patient_name: string;
  token_number: number;
  status: 'waiting' | 'serving' | 'completed';
}

interface NowServingProps {
  currentPatient: Patient | null;
  onCallNext: () => void;
}

export default function NowServing({ currentPatient, onCallNext }: NowServingProps) {
  return (
    <div className="bg-[#f2f3ff] border border-[#f1f5f9] rounded-2xl p-[24px] relative overflow-hidden flex flex-col items-center justify-center py-[64px] transition-all duration-200 hover:border-[#bcc9c6]">
      <div className="absolute top-0 right-0 p-[48px] opacity-5 pointer-events-none">
        <span className="material-symbols-outlined text-[120px]">monitor_heart</span>
      </div>
      <div className="text-center relative z-10 w-full max-w-2xl">
        <div className="inline-flex items-center gap-[8px] px-[16px] py-1 bg-[#00685f]/10 text-[#00685f] rounded-full mb-[24px]">
          <span className="material-symbols-outlined text-sm animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>fiber_manual_record</span>
          <span className="text-[12px] uppercase tracking-widest font-bold leading-[16px]">Now Serving</span>
        </div>
        <div className="mb-[48px]">
          <span className="text-[120px] leading-none font-extrabold text-[#00685f] tracking-tighter block">
            {currentPatient ? `T-${currentPatient.token_number}` : '---'}
          </span>
          <span className="px-[24px] py-1 bg-[#00685f]/10 text-[#00685f] text-[14px] font-semibold leading-[20px] tracking-[0.05em] rounded-lg border border-[#00685f]/20 inline-block mt-2 uppercase">
            In Session
          </span>
        </div>
        <button 
          className="w-full h-40 bg-[#00685f] text-white rounded-2xl flex flex-col items-center justify-center gap-[16px] hover:bg-[#008378] transition-all shadow-xl shadow-[#00685f]/20 active:scale-[0.97]" 
          onClick={(e) => {
            const btn = e.currentTarget;
            btn.classList.add('animate-pulse');
            setTimeout(() => btn.classList.remove('animate-pulse'), 500);
            onCallNext();
          }}
        >
          <span className="material-symbols-outlined text-5xl">record_voice_over</span>
          <span className="text-[24px] font-bold leading-[32px] tracking-[-0.01em]">Call Next Patient</span>
        </button>
      </div>
    </div>
  );
}
