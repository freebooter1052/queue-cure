'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import TopNavBar from '@/components/TopNavBar';
import PatientRegistration from '@/components/PatientRegistration';
import NowServing from '@/components/NowServing';
import QueueList from '@/components/QueueList';

interface Patient {
  id: number;
  patient_name: string;
  token_number: number;
  status: 'waiting' | 'serving' | 'completed';
  created_at: string;
}

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .order('id', { ascending: true });
    
    if (data) setPatients(data as Patient[]);
  };

  useEffect(() => {
    fetchPatients();
    
    const channel = supabase.channel('realtime-patients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, payload => {
        fetchPatients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRegister = async (name: string) => {
    const { data, error } = await supabase.from('patients').insert({
      patient_name: name,
      clinic_id: 1,
      status: 'waiting'
    }).select().single();
    
    if (data) {
        return data.token_number;
    }
    return null;
  };

  const handleCallNext = async () => {
    const current = patients.find(p => p.status === 'serving');
    const next = patients.find(p => p.status === 'waiting');
    
    if (current) {
      await supabase.from('patients').update({ status: 'completed' }).eq('id', current.id);
    }
    if (next) {
      await supabase.from('patients').update({ status: 'serving' }).eq('id', next.id);
    }
  };

  const currentPatient = patients.find(p => p.status === 'serving') || null;
  const waitingPatients = patients.filter(p => p.status === 'waiting');

  return (
    <div className="bg-[#ffffff] min-h-screen font-sans text-[#131b2e]">
      <TopNavBar />
      <main className="max-w-[1440px] mx-auto px-[24px] py-[24px] space-y-[24px]">
        {/* Header Actions Area */}
        <div className="flex justify-end items-center">
          <div className="flex items-center gap-[8px] bg-[#f2f3ff] p-2 px-4 rounded-xl border border-[#f1f5f9]">
            <span className="text-[12px] font-medium leading-[16px] text-[#3d4947]">Avg. Consultation Time:</span>
            <span className="text-[20px] font-bold leading-[28px] text-[#00685f] px-2 bg-white border border-[#e2e8f0] rounded">[ 15 ]</span>
            <span className="text-[12px] font-medium leading-[16px] text-[#3d4947]">minutes</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
          {/* Left Column - Patient Intake */}
          <div className="lg:col-span-4 space-y-[24px]">
            <PatientRegistration onRegister={handleRegister} />
          </div>

          {/* Right Column - Queue Controls */}
          <div className="lg:col-span-8 space-y-[24px]">
            <NowServing currentPatient={currentPatient} onCallNext={handleCallNext} />
            <QueueList patients={waitingPatients} />
          </div>
        </div>
      </main>
    </div>
  );
}
