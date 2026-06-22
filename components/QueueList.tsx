'use client';
import React from 'react';

interface Patient {
  id: number;
  patient_name: string;
  token_number: number;
  status: 'waiting' | 'serving' | 'completed';
  created_at: string;
}

interface QueueListProps {
  patients: Patient[];
}

export default function QueueList({ patients }: QueueListProps) {
  const getWaitTime = (createdAt: string) => {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      return Math.floor(diffMs / 60000);
  };

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-2xl p-[24px] transition-all duration-200 hover:border-[#bcc9c6]">
      <div className="flex items-center justify-between mb-[48px]">
        <div className="flex items-center gap-[16px]">
          <span className="material-symbols-outlined text-[#3d4947]">list_alt</span>
          <h3 className="text-[20px] font-semibold leading-[28px] text-[#131b2e]">QUEUE</h3>
        </div>
        <span className="text-[12px] font-bold leading-[16px] px-3 py-1 bg-[#f1f5f9] rounded-full text-[#3d4947]">
          {patients.length} Patients Waiting
        </span>
      </div>
      
      <div className="space-y-[8px]">
        {patients.map((patient, index) => {
          const isFirst = index === 0;
          return (
            <div key={patient.id} className={`flex items-center justify-between p-[24px] border-l-4 rounded-r-lg group hover:bg-[#eaedff] transition-colors ${isFirst ? 'border-[#00685f] bg-[#faf8ff]' : 'bg-white border-transparent rounded-lg'}`}>
              <div className="flex items-center gap-[24px]">
                <span className={`text-[24px] font-bold leading-[32px] tracking-[-0.01em] w-16 ${isFirst ? 'text-[#00685f]' : 'text-[#3d4947]'}`}>
                  T-{patient.token_number}
                </span>
                <p className="text-[20px] font-semibold leading-[28px] text-[#131b2e]">{patient.patient_name}</p>
              </div>
              <span className={`text-[14px] font-normal leading-[20px] text-[#3d4947] px-3 py-1 rounded-full border border-[#f1f5f9] ${isFirst ? 'bg-white' : 'bg-[#f8fafc]'}`}>
                {getWaitTime(patient.created_at)}m wait
              </span>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-[48px] py-[16px] border border-[#e2e8f0] rounded-lg text-[14px] font-semibold leading-[20px] tracking-[0.05em] text-[#3d4947] hover:bg-[#f2f3ff] transition-colors">
        View Full Queue
      </button>
    </div>
  );
}
