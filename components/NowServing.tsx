'use client';
import React, { useState, useEffect } from 'react';
import type { Patient } from '@/lib/types';

interface NowServingProps {
  currentPatient: Patient | null;
  onCallNext: () => void;
  onSkip: (patientId: string) => void;
  isLoading: boolean;
}

function formatElapsed(calledAt: string | null): string {
  if (!calledAt) return '';
  const diffMs = Date.now() - new Date(calledAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  return `${mins}m in session`;
}

export default function NowServing({ currentPatient, onCallNext, onSkip, isLoading }: NowServingProps) {
  const [elapsed, setElapsed] = useState('');

  // Update elapsed time every minute
  useEffect(() => {
    if (!currentPatient?.called_at) {
      const timer = setTimeout(() => setElapsed(''), 0);
      return () => clearTimeout(timer);
    }
    const updateElapsed = () => setElapsed(formatElapsed(currentPatient.called_at));
    const timer = setTimeout(updateElapsed, 0); // initial update avoiding sync setState
    const interval = setInterval(updateElapsed, 60000);
    return () => {
        clearTimeout(timer);
        clearInterval(interval);
    };
  }, [currentPatient?.called_at]);

  return (
    <div className="bg-[#f2f3ff] border border-[#f1f5f9] rounded-2xl p-[24px] relative overflow-hidden flex flex-col items-center justify-center py-[48px] transition-all duration-200 hover:border-[#bcc9c6]">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-[48px] opacity-5 pointer-events-none">
        <span className="material-symbols-outlined text-[120px]">monitor_heart</span>
      </div>

      <div className="text-center relative z-10 w-full max-w-2xl">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-[8px] px-[16px] py-1 rounded-full mb-[24px] ${
          currentPatient?.is_emergency
            ? 'bg-red-600 text-white animate-pulse'
            : 'bg-[#00685f]/10 text-[#00685f]'
        }`}>
          <span
            className={`material-symbols-outlined text-sm ${currentPatient ? 'animate-pulse' : ''}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {currentPatient?.is_emergency ? 'emergency' : 'fiber_manual_record'}
          </span>
          <span className="text-[12px] uppercase tracking-widest font-bold leading-[16px]">
            {currentPatient?.is_emergency ? 'Emergency Session' : 'Now Serving'}
          </span>
        </div>

        {/* Token + patient info */}
        <div className="mb-[36px]">
          <span className={`text-[120px] leading-none font-extrabold tracking-tighter block ${
            currentPatient?.is_emergency ? 'text-red-600' : 'text-[#00685f]'
          }`}>
            {currentPatient ? `T-${currentPatient.token_number}` : '---'}
          </span>

          {currentPatient ? (
            <div className="mt-2 space-y-1">
              <p className={`text-[20px] font-semibold ${currentPatient.is_emergency ? 'text-red-900' : 'text-[#131b2e]'}`}>{currentPatient.patient_name}</p>
              <div className="flex items-center justify-center gap-3">
                <span className={`px-[16px] py-1 text-[14px] font-semibold leading-[20px] rounded-lg border inline-block uppercase tracking-wide ${
                  currentPatient.is_emergency
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-[#00685f]/10 text-[#00685f] border-[#00685f]/20'
                }`}>
                  In Session
                </span>
                {elapsed && (
                  <span className="text-[13px] text-[#3d4947]">
                    {elapsed}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="px-[24px] py-1 bg-[#3d4947]/10 text-[#3d4947] text-[14px] font-semibold leading-[20px] rounded-lg border border-[#3d4947]/20 inline-block mt-2 uppercase">
              No patient in session
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {/* Skip button — only show when someone is being served */}
          {currentPatient && (
            <button
              onClick={() => onSkip(currentPatient.id)}
              disabled={isLoading}
              className="flex-1 h-40 bg-white border-2 border-[#e2e8f0] text-[#3d4947] rounded-2xl flex flex-col items-center justify-center gap-[12px] hover:border-[#00685f]/30 hover:bg-[#f2f3ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-4xl">skip_next</span>
              <span className="text-[18px] font-bold leading-[24px]">Skip Patient</span>
            </button>
          )}

          {/* Call Next */}
          <button
            className={`flex-1 h-40 bg-[#00685f] text-white rounded-2xl flex flex-col items-center justify-center gap-[16px] hover:bg-[#008378] transition-all shadow-xl shadow-[#00685f]/20 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${!currentPatient ? 'w-full' : ''}`}
            onClick={() => {
              onCallNext();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-5xl animate-spin">progress_activity</span>
                <span className="text-[20px] font-bold leading-[28px]">Calling...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-5xl">record_voice_over</span>
                <span className="text-[24px] font-bold leading-[32px] tracking-[-0.01em]">
                  {currentPatient ? 'Call Next Patient' : 'Start Queue'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
