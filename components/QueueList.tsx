'use client';
import React, { useState } from 'react';
import type { Patient } from '@/lib/types';

interface QueueListProps {
  patients: Patient[];
  onRemovePatient: (patientId: string) => void;
}

export default function QueueList({ patients, onRemovePatient }: QueueListProps) {
  const [showAll, setShowAll] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => {
        clearTimeout(timer);
        clearInterval(interval);
    };
  }, []);

  const getWaitTime = (createdAt: string) => {
    if (!now) return 0;
    const diffMs = now - new Date(createdAt).getTime();
    return Math.floor(diffMs / 60000);
  };

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
          <div className="space-y-[8px]">
            {displayedPatients.map((patient, index) => {
              const isFirst = index === 0;
              const isRemoving = removingId === patient.id;
              const waitMins = getWaitTime(patient.created_at);

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
                    <span className={`text-[13px] font-normal text-[#3d4947] px-3 py-1 rounded-full border border-[#f1f5f9] ${
                      isFirst ? 'bg-white' : 'bg-[#f8fafc]'
                    } ${waitMins > 30 ? 'text-orange-500 border-orange-200 bg-orange-50' : ''}`}>
                      {waitMins}m wait
                    </span>

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
