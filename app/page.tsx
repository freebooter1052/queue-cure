'use client';
import React, { useState, useEffect, useCallback } from 'react';
import TopNavBar from '@/components/TopNavBar';
import PatientRegistration from '@/components/PatientRegistration';
import NowServing from '@/components/NowServing';
import QueueList from '@/components/QueueList';
import AvgConsultTime from '@/components/AvgConsultTime';
import {
  fetchActivePatients,
  registerPatient,
  callNextPatient,
  skipPatient,
  removePatient,
  getAvgConsultTime,
  setAvgConsultTime,
  subscribeToQueue,
} from '@/lib/queueApi';
import type { Patient } from '@/lib/types';

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [avgConsultTime, setAvgConsultTimeState] = useState<number>(15);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── Data Fetching ───────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    try {
      const data = await fetchActivePatients();
      setPatients(data);
    } catch (err) {
      setGlobalError((err as Error).message);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const mins = await getAvgConsultTime();
      setAvgConsultTimeState(mins);
    } catch {
      // Use default if settings not available
    }
  }, []);

  useEffect(() => {
    loadPatients();
    loadSettings();

    // Subscribe to realtime queue changes
    const channel = subscribeToQueue(() => {
      loadPatients();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [loadPatients, loadSettings]);

  // ── Handlers ────────────────────────────────────────────────

  const handleRegister = async (name: string): Promise<number | null> => {
    try {
      const patient = await registerPatient(name);
      return patient.token_number;
    } catch (err) {
      setGlobalError((err as Error).message);
      return null;
    }
  };

  const handleCallNext = async () => {
    setIsCallingNext(true);
    try {
      const current = patients.find(p => p.status === 'serving');
      await callNextPatient(current?.id);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleSkip = async (patientId: string) => {
    try {
      await skipPatient(patientId);
    } catch (err) {
      setGlobalError((err as Error).message);
    }
  };

  const handleRemove = async (patientId: string) => {
    try {
      await removePatient(patientId);
    } catch (err) {
      setGlobalError((err as Error).message);
    }
  };

  const handleAvgConsultChange = async (newValue: number) => {
    setAvgConsultTimeState(newValue); // Optimistic update
    try {
      await setAvgConsultTime(newValue);
    } catch (err) {
      setGlobalError((err as Error).message);
    }
  };

  // ── Derived State ───────────────────────────────────────────
  const currentPatient = patients.find(p => p.status === 'serving') || null;
  const waitingPatients = patients.filter(p => p.status === 'waiting');

  return (
    <div className="bg-[#ffffff] min-h-screen font-sans text-[#131b2e]">
      <TopNavBar />

      <main className="max-w-[1440px] mx-auto px-[24px] py-[24px] space-y-[24px]">

        {/* Global Error Toast */}
        {globalError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{globalError}</span>
            <button
              onClick={() => setGlobalError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Header Actions Area */}
        <div className="flex justify-end items-center">
          <AvgConsultTime
            value={avgConsultTime}
            onChange={handleAvgConsultChange}
            onCallNext={handleCallNext}
            currentPatientId={currentPatient?.id || null}
            hasWaitingPatients={waitingPatients.length > 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
          {/* Left Column - Patient Intake */}
          <div className="lg:col-span-4 space-y-[24px]">
            <PatientRegistration onRegister={handleRegister} />
          </div>

          {/* Right Column - Queue Controls */}
          <div className="lg:col-span-8 space-y-[24px]">
            <NowServing
              currentPatient={currentPatient}
              onCallNext={handleCallNext}
              onSkip={handleSkip}
              isLoading={isCallingNext}
            />
            <QueueList
              patients={waitingPatients}
              onRemovePatient={handleRemove}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
