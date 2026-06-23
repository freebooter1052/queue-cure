'use client';
import React, { useState, useEffect } from 'react';
import type { Patient } from '@/lib/types';

interface QueueListProps {
  patients: Patient[];
  onRemovePatient: (patientId: string) => void;
  /** Average consultation time in minutes (from settings) */
  avgConsultMins: number;
  /** called_at timestamp of the patient currently being served (null if nobody serving) */
  servingCalledAt: string | null;
}

/**
 * Compute estimated wait for the token at `idx` (0-indexed) in the waiting list.
 * Formula: sessionRemainingMins + idx × avgConsultMins
 *
 * For the first patient (idx=0)  → just the remaining time of the current session.
 * For the second patient (idx=1) → remaining session + 1 full consult slot.
 * ...and so on.
 */
function computeTokenEstWait(
  idx: number,
  avgConsultMins: number,
  servingCalledAt: string | null,
  nowMs: number,
): number {
  if (!servingCalledAt) {
    return idx * avgConsultMins;
  }
  const sessionElapsedMins = (nowMs - new Date(servingCalledAt).getTime()) / 60_000;
  const elapsed = Math.max(0, sessionElapsedMins);
  const sessionRemainingMins = avgConsultMins - (elapsed % avgConsultMins);
  return Math.round(sessionRemainingMins + idx * avgConsultMins);
}

export default function QueueList({
  patients,
  onRemovePatient,
  avgConsultMins,
  servingCalledAt,
}: QueueListProps) {
  const [showAll, setShowAll] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Ticking clock — update every 1s for real-time responsiveness and sync
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleRemove = async (patientId: string) => {
    setRemovingId(patientId);
    await onRemovePatient(patientId);
    setRemovingId(null);
  };

  const displayedPatients = showAll ? patients : patients.slice(0, 8);
  const hiddenCount = patients.length - 8;

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-2xl p-[24px] transition-all duration-200 hover:border-[#bcc9c6]">
      <div className="flex items-center justify-between mb-[32px]">
        <div className="flex items-center gap-[16px]">
          <span className="material-symbols-outlined text-[#3d4947]">list_alt</span>
          <h3 className="text-[20px] font-semibold leading-[28px] text-[#131b2e]">QUEUE</h3>
        </div>
        <span className="text-[12px] font-bold leading-[16px] px-3 py-1 bg-[#f1f5f9] rounded-full text-[#3d4947]">
          {patients.length} Waiting
        </span>
      </div>

      {/* Empty State */}
      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-[48px] gap-3 text-[#bcc9c6]">
          <span className="material-symbols-outlined text-[48px]">sentiment_satisfied</span>
          <p className="text-[16px] font-medium">Queue is empty</p>
          <p className="text-[13px]">Register a patient to get started</p>
        </div>
      ) : (
        <>
          {/* Column header */}
          <div className="flex items-center justify-between px-[16px] mb-[8px]">
            <div className="flex items-center gap-[20px]">
              <span className="text-[11px] font-bold text-[#bcc9c6] uppercase tracking-widest w-4" />
              <span className="text-[11px] font-bold text-[#bcc9c6] uppercase tracking-widest w-14">Token</span>
              <span className="text-[11px] font-bold text-[#bcc9c6] uppercase tracking-widest">Name</span>
            </div>
            <span className="text-[11px] font-bold text-[#bcc9c6] uppercase tracking-widest">Est. Wait</span>
          </div>

          <div className="space-y-[8px]">
            {displayedPatients.map((patient, index) => {
              const isFirst = index === 0;
              const isRemoving = removingId === patient.id;

              // Estimated wait time until this patient is called
              const estWaitMins = now
                ? computeTokenEstWait(index, avgConsultMins, servingCalledAt, now)
                : null;

              // Urgency colour: > 2× avg is concerning
              const isUrgent = estWaitMins !== null && estWaitMins > avgConsultMins * 2;

              return (
                <div
                  key={patient.id}
                  className={`flex items-center justify-between p-[16px] border-l-4 rounded-r-lg group transition-all ${
                    isFirst
                      ? 'border-[#00685f] bg-[#faf8ff]'
                      : 'bg-white border-transparent hover:bg-[#eaedff]'
                  } ${isRemoving ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-[20px]">
                    {/* Position badge */}
                    <span className="text-[12px] font-bold text-[#bcc9c6] w-4 text-center">
                      {index + 1}
                    </span>
                    <span className={`text-[22px] font-bold leading-[28px] tracking-[-0.01em] w-14 ${isFirst ? 'text-[#00685f]' : 'text-[#3d4947]'}`}>
                      T-{patient.token_number}
                    </span>
                    <p className="text-[16px] font-semibold text-[#131b2e]">{patient.patient_name}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Estimated wait badge */}
                    {estWaitMins !== null ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={`text-[14px] font-black tabular-nums leading-tight ${
                            isFirst
                              ? 'text-[#00685f]'
                              : isUrgent
                              ? 'text-orange-500'
                              : 'text-[#3d4947]'
                          }`}
                        >
                          {estWaitMins <= 0 ? 'Now' : `~${estWaitMins}m`}
                        </span>
                        <span className="text-[10px] font-semibold text-[#bcc9c6] uppercase tracking-wider">
                          est. wait
                        </span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-[#bcc9c6] px-3 py-1 rounded-full border border-[#f1f5f9] bg-[#f8fafc]">
                        —
                      </span>
                    )}

                    {/* Remove button — visible on hover */}
                    <button
                      onClick={() => handleRemove(patient.id)}
                      title="Remove from queue"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg text-[#bcc9c6] hover:text-red-500"
                    >
                      <span className="material-symbols-outlined text-base">person_remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View Full / Collapse */}
          {patients.length > 8 && (
            <button
              onClick={() => setShowAll(prev => !prev)}
              className="w-full mt-[24px] py-[14px] border border-[#e2e8f0] rounded-lg text-[14px] font-semibold leading-[20px] tracking-[0.05em] text-[#3d4947] hover:bg-[#f2f3ff] transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                {showAll ? 'expand_less' : 'expand_more'}
              </span>
              {showAll ? 'Show Less' : `View ${hiddenCount} More Patients`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
